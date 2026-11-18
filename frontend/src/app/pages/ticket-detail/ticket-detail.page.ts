import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCalendarDays, LucideCheck, LucideCircleAlert, LucideClock3, LucideFileText, LucideLoaderCircle, LucideShieldCheck, LucideTag } from '@lucide/angular';
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
    LucideLoaderCircle,
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
  readonly statuses = TICKET_STATUSES;
  readonly ticket = signal<Ticket | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly saved = signal(false);

  readonly agentForm = this.formBuilder.nonNullable.group({
    status: ['Open' as TicketStatus, Validators.required],
    resolution_note: [''],
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
      this.loadError.set('');
      this.ticket.set(ticket);
      this.agentForm.patchValue({
        status: ticket.status,
        resolution_note: ticket.resolution_note ?? '',
      });
      this.agentForm.markAsPristine();
      this.saved.set(false);
    });
  }

  saveUpdate(): void {
    const current = this.ticket();
    if (!current || this.saving()) return;

    const status = this.agentForm.controls.status.value;
    const resolutionNote = this.agentForm.controls.resolution_note.value.trim();
    this.saveError.set('');
    this.saved.set(false);

    if (status === 'Resolved' && !resolutionNote) {
      this.agentForm.controls.resolution_note.markAsTouched();
      this.saveError.set('Add a resolution note before marking this ticket as resolved.');
      return;
    }

    const payload: UpdateTicketRequest = { status };
    if (resolutionNote) payload.resolution_note = resolutionNote;

    this.saving.set(true);
    this.ticketService.updateTicket(current.id, payload).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.agentForm.patchValue({
          status: updated.status,
          resolution_note: updated.resolution_note ?? '',
        });
        this.agentForm.markAsPristine();
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('The update could not be saved. Please check the API connection and try again.');
      },
    });
  }

  statusClass(status: TicketStatus): string {
    return status === 'Resolved' ? 'status-resolved' : status === 'In Progress' ? 'status-progress' : 'status-open';
  }

  shortId(id: string): string {
    return `#${id.slice(-6).toUpperCase()}`;
  }
}
