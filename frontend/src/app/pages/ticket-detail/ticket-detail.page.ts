import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarDays,
  LucideCheck,
  LucideCircleAlert,
  LucideClock3,
  LucideFileText,
  LucideLoaderCircle,
  LucideShieldCheck,
  LucideTag,
} from '@lucide/angular';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
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
    LucideLoaderCircle,
    LucideShieldCheck,
    LucideTag,
  ],
  templateUrl: './ticket-detail.page.html',
  styleUrl: './ticket-detail.page.css',
})
export class TicketDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private pendingAutoSave: string | null = null;

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
  readonly autoSaveMessage = signal('');

  readonly agentForm = this.formBuilder.nonNullable.group({
    status: ['Open' as TicketStatus, Validators.required],
    resolution_note: [''],
  });

  ngOnInit(): void {
    this.agentForm.controls.resolution_note.valueChanges.pipe(
      debounceTime(850),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((note) => this.autoSaveResolutionNote(note));

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

      this.loadError.set('');
      this.ticket.set(ticket);
      this.agentForm.patchValue({
        status: ticket.status,
        resolution_note: ticket.resolution_note ?? '',
      }, { emitEvent: false });
      this.agentForm.markAsPristine();
      this.saved.set(false);
      this.saveError.set('');
      this.autoSaveMessage.set('');

      if (this.demoMode.role() === 'agent' && ticket.status === 'Open') {
        this.moveToInProgress(ticket);
      }
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
        this.autoSaveMessage.set('This ticket moved to In Progress automatically when you opened it.');
        this.flushPendingAutoSave();
      },
      error: () => {
        this.autoStatusUpdating.set(false);
        this.saveError.set('The ticket opened, but its status could not be moved to In Progress. Please retry with Save changes.');
        this.flushPendingAutoSave();
      },
    });
  }

  private wordCount(value: string): number {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }

  resolutionNoteWordCount(): number {
    return this.wordCount(this.agentForm.controls.resolution_note.value);
  }

  private autoSaveResolutionNote(note: string): void {
    const normalizedNote = note.trim();
    if (this.wordCount(normalizedNote) < 2) {
      this.pendingAutoSave = null;
      this.autoSaveMessage.set('Add at least two words to save the resolution and mark this ticket as Resolved.');
      return;
    }

    const current = this.ticket();
    if (!current || this.demoMode.role() !== 'agent') return;

    if (this.saving() || this.autoStatusUpdating()) {
      this.pendingAutoSave = normalizedNote;
      return;
    }

    if (current.status === 'Resolved' && current.resolution_note === normalizedNote) return;

    this.saveError.set('');
    this.saving.set(true);
    this.ticketService.updateTicket(current.id, {
      status: 'Resolved',
      resolution_note: normalizedNote,
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        if (this.ticket()?.id !== current.id) return;
        this.ticket.set(updated);
        this.agentForm.patchValue({ status: 'Resolved' }, { emitEvent: false });
        this.saving.set(false);
        this.saved.set(true);
        this.autoSaveMessage.set(
          current.status === 'Resolved'
            ? 'Resolution note saved automatically.'
            : 'Two or more words detected. The ticket is now Resolved and the note has been saved.',
        );
        this.flushPendingAutoSave();
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Automatic resolution could not be saved. Check the connection and use Save changes to retry.');
      },
    });
  }

  private flushPendingAutoSave(): void {
    const pending = this.pendingAutoSave;
    this.pendingAutoSave = null;
    if (pending) this.autoSaveResolutionNote(pending);
  }

  saveUpdate(): void {
    const current = this.ticket();
    if (!current || this.saving()) return;

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
    if (resolutionNote) payload.resolution_note = resolutionNote;

    this.saving.set(true);
    this.ticketService.updateTicket(current.id, payload).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.agentForm.patchValue({
          status: updated.status,
          resolution_note: updated.resolution_note ?? '',
        }, { emitEvent: false });
        this.agentForm.markAsPristine();
        this.saving.set(false);
        this.saved.set(true);
        void this.router.navigate(['/tickets'], { queryParams: this.route.snapshot.queryParams });
        this.flushPendingAutoSave();
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
    return `#${id.slice(-6).toUpperCase()}`;
  }
}
