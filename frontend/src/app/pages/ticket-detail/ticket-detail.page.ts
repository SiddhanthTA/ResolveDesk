import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarDays,
  LucideCheck,
  LucideCircleAlert,
  LucideClock3,
  LucideFileText,
  LucideInfo,
  LucideLoaderCircle,
  LucideMessageSquare,
  LucideSend,
  LucideShieldCheck,
  LucideTag,
} from '@lucide/angular';
import { catchError, map, of, switchMap } from 'rxjs';
import { TICKET_STATUSES, Ticket, TicketStatus, UpdateTicketRequest } from '../../core/models/ticket.model';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-ticket-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    LucideArrowLeft,
    LucideCalendarDays,
    LucideCheck,
    LucideCircleAlert,
    LucideClock3,
    LucideFileText,
    LucideInfo,
    LucideLoaderCircle,
    LucideMessageSquare,
    LucideSend,
    LucideShieldCheck,
    LucideTag,
  ],
  templateUrl: './ticket-detail.page.html',
  styleUrl: './ticket-detail.page.css',
})
export class TicketDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly demoMode = inject(DemoModeService);
  readonly routeQuery = this.route.snapshot.queryParams;
  readonly statuses = TICKET_STATUSES;
  readonly ticket = signal<Ticket | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly autoStatusUpdating = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saved = signal(false);
  readonly managementExpanded = signal(false);
  readonly reopening = signal(false);
  readonly reopenError = signal('');
  readonly replySending = signal(false);
  readonly replyError = signal('');
  readonly ratingSaving = signal(false);
  readonly ratingError = signal('');
  readonly ratingSaved = signal(false);
  readonly selectedRating = signal(0);

  readonly replyForm = this.formBuilder.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  readonly agentForm = this.formBuilder.nonNullable.group({
    status: ['Open' as TicketStatus, Validators.required],
    resolution_note: [''],
  });

  readonly ratingForm = this.formBuilder.nonNullable.group({
    note: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      switchMap((id) => {
        this.loading.set(true);
        this.loadError.set('');
        return this.ticketService.getTicket(id).pipe(
          map((ticket) => ({ ticket, errorStatus: 0 })),
          catchError((error: HttpErrorResponse) => of({ ticket: null, errorStatus: error.status })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ ticket, errorStatus }) => {
      this.loading.set(false);
      if (!ticket) {
        this.ticket.set(null);
        this.loadError.set(errorStatus === 404
          ? 'This ticket could not be found. It may have been removed or the link may be incorrect.'
          : 'We could not load this ticket. Check that the Django API and MongoDB are running, then try again.');
        return;
      }

      this.ticket.set(ticket);
      this.agentForm.patchValue({
        status: ticket.status,
        resolution_note: ticket.resolution_note ?? '',
      }, { emitEvent: false });
      this.agentForm.markAsPristine();
      this.managementExpanded.set(this.demoMode.role() === 'agent' && (!ticket.resolution_note || ticket.is_reopened));
      this.saved.set(false);
      this.saveError.set('');
      this.selectedRating.set(ticket.rating ?? 0);
      this.ratingForm.patchValue({ note: ticket.rating_note ?? '' }, { emitEvent: false });
      this.ratingError.set('');
      this.ratingSaved.set(false);
      this.reopenError.set('');
      this.replyError.set('');

      if (this.demoMode.role() === 'agent' && ticket.rating !== null && !ticket.rating_seen_by_agent) {
        this.markRatingAsSeen(ticket);
      }
      if (this.demoMode.role() === 'agent' && ticket.status === 'Open') {
        this.moveToInProgress(ticket);
      }
    });
  }

  private markRatingAsSeen(current: Ticket): void {
    this.ticketService.markRatingSeen(current.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        if (this.ticket()?.id === current.id) this.ticket.set(updated);
      },
    });
  }

  private moveToInProgress(current: Ticket): void {
    this.autoStatusUpdating.set(true);
    this.ticketService.updateTicket(current.id, { status: 'In Progress' }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.agentForm.patchValue({ status: updated.status }, { emitEvent: false });
        this.autoStatusUpdating.set(false);
      },
      error: () => {
        this.autoStatusUpdating.set(false);
        this.saveError.set('The ticket opened, but its status could not be moved to In Progress. Please retry with Save changes.');
      },
    });
  }

  customerRepliesRemaining(): number {
    return Math.max(0, 5 - (this.ticket()?.customer_reply_count ?? 0));
  }

  agentRepliesRemaining(): number {
    return Math.max(0, 5 - (this.ticket()?.agent_reply_count ?? 0));
  }

  isMyTurn(): boolean {
    const current = this.ticket();
    if (!current) return false;
    return current.next_reply_by
      ? current.next_reply_by === this.demoMode.role()
      : current.last_reply_by !== this.demoMode.role();
  }

  canSendReply(): boolean {
    const current = this.ticket();
    if (!current || current.status === 'Resolved' || this.replyForm.invalid || this.replySending()) return false;
    const remaining = this.demoMode.role() === 'agent'
      ? current.agent_reply_count < 5
      : current.customer_reply_count < 5;
    return remaining && this.isMyTurn();
  }

  replyWaitMessage(): string {
    const current = this.ticket();
    if (!current) return '';
    const remaining = this.demoMode.role() === 'agent'
      ? current.agent_reply_count
      : current.customer_reply_count;
    if (remaining >= 5) return 'This side has used all five replies for this ticket.';
    return this.demoMode.role() === 'agent'
      ? 'Your reply has been sent. Wait for the customer to respond before sending another message.'
      : 'Your reply has been sent. Wait for the support team to respond before sending another message.';
  }

  sendReply(): void {
    const current = this.ticket();
    if (!current || !this.canSendReply()) return;
    const message = this.replyForm.controls.message.value.trim();
    if (!message) return;

    this.replySending.set(true);
    this.replyError.set('');
    this.ticketService.addReply(current.id, {
      sender_role: this.demoMode.role(),
      message,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.replyForm.reset({ message: '' });
        this.replySending.set(false);
        this.agentForm.patchValue({ status: updated.status }, { emitEvent: false });
      },
      error: (error: HttpErrorResponse) => {
        this.replySending.set(false);
        const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
        this.replyError.set(error.status === 409
          ? (detail || 'Please wait for the other side to reply before sending another message.')
          : 'Your reply could not be sent. Please check the connection and try again.');
      },
    });
  }

  reopenTicket(): void {
    const current = this.ticket();
    if (!current || current.status !== 'Resolved' || this.reopening()) return;
    this.reopening.set(true);
    this.reopenError.set('');
    this.ticketService.reopenTicket(current.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.reopening.set(false);
        this.selectedRating.set(0);
        this.ratingForm.reset({ note: '' });
        this.ratingSaved.set(false);
        this.agentForm.patchValue({ status: updated.status }, { emitEvent: false });
      },
      error: (error: HttpErrorResponse) => {
        this.reopening.set(false);
        this.reopenError.set(error.status === 409
          ? 'This ticket is no longer resolved. Refresh the page to see its latest status.'
          : 'The ticket could not be reopened. Please try again.');
      },
    });
  }

  selectRating(rating: number): void {
    this.selectedRating.set(rating);
    this.ratingSaved.set(false);
    this.ratingError.set('');
  }

  saveRating(): void {
    const current = this.ticket();
    const rating = this.selectedRating();
    if (!current || current.status !== 'Resolved' || rating < 1 || rating > 5 || this.ratingSaving()) return;

    this.ratingSaving.set(true);
    this.ratingError.set('');
    this.ticketService.saveRating(current.id, {
      rating,
      note: this.ratingForm.controls.note.value.trim(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.ratingSaving.set(false);
        this.ratingSaved.set(true);
      },
      error: () => {
        this.ratingSaving.set(false);
        this.ratingError.set('Your feedback could not be saved. Please try again.');
      },
    });
  }

  editResponse(): void {
    this.managementExpanded.set(true);
    this.saved.set(false);
  }

  closeResponseEditor(): void {
    const current = this.ticket();
    this.agentForm.patchValue({
      status: current?.status ?? 'Open',
      resolution_note: current?.resolution_note ?? '',
    }, { emitEvent: false });
    this.agentForm.markAsPristine();
    this.managementExpanded.set(false);
    this.saveError.set('');
  }

  private wordCount(value: string): number {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }

  resolutionNoteWordCount(): number {
    return this.wordCount(this.agentForm.controls.resolution_note.value);
  }

  saveUpdate(): void {
    const current = this.ticket();
    if (!current || this.saving() || this.autoStatusUpdating()) return;

    const status = this.agentForm.controls.status.value;
    const resolutionNote = this.agentForm.controls.resolution_note.value.trim();
    this.saveError.set('');
    this.saved.set(false);

    if (status === 'Resolved' && this.wordCount(resolutionNote) < 2) {
      this.agentForm.controls.resolution_note.markAsTouched();
      this.saveError.set('Enter a resolution note with at least two words before marking this ticket as resolved.');
      return;
    }

    const payload: UpdateTicketRequest = { status };
    if (resolutionNote && resolutionNote !== (current.resolution_note ?? '')) {
      payload.resolution_note = resolutionNote;
    }

    this.saving.set(true);
    this.ticketService.updateTicket(current.id, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.agentForm.patchValue({
          status: updated.status,
          resolution_note: updated.resolution_note ?? '',
        }, { emitEvent: false });
        this.agentForm.markAsPristine();
        this.saving.set(false);
        this.saved.set(true);
        this.managementExpanded.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('The update could not be saved. Please check the API connection and try again.');
      },
    });
  }

  statusClass(status: TicketStatus): string {
    return status === 'Resolved'
      ? 'status-resolved'
      : status === 'In Progress'
        ? 'status-progress'
        : 'status-open';
  }

  shortId(id: string): string {
    return '#' + id.slice(-6).toUpperCase();
  }
}
