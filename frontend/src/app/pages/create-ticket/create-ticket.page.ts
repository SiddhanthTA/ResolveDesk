import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCheck, LucideInfo, LucideLoaderCircle, LucideSend, LucideSparkles, LucideWandSparkles } from '@lucide/angular';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { TICKET_CATEGORIES, Ticket, TicketCategory } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';
import { DemoModeService } from '../../core/services/demo-mode.service';

function noWhitespace(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { whitespace: true }
    : null;
}

type SuggestionState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-create-ticket-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCheck,
    LucideInfo,
    LucideLoaderCircle,
    LucideSend,
    LucideSparkles,
    LucideWandSparkles,
  ],
  templateUrl: './create-ticket.page.html',
  styleUrl: './create-ticket.page.css',
})
export class CreateTicketPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly ticketService = inject(TicketService);
  private readonly router = inject(Router);
  private readonly demoMode = inject(DemoModeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = TICKET_CATEGORIES;
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly suggestionState = signal<SuggestionState>('idle');
  readonly suggestions = signal<Ticket[]>([]);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, noWhitespace, Validators.minLength(5), Validators.maxLength(150)]],
    description: ['', [Validators.required, noWhitespace, Validators.minLength(15), Validators.maxLength(5000)]],
    category: ['Technical' as TicketCategory, Validators.required],
  });

  constructor() {
    if (this.demoMode.role() === 'agent') {
      void this.router.navigate(['/dashboard']);
      return;
    }
    this.form.valueChanges.pipe(
      debounceTime(700),
      map((value) => ({
        title: value.title?.trim() ?? '',
        description: value.description?.trim() ?? '',
      })),
      distinctUntilChanged((previous, current) =>
        previous.title === current.title && previous.description === current.description,
      ),
      switchMap((query) => {
        if (query.title.length < 3 || query.description.length < 8) {
          return of({ state: 'idle' as const, items: [] as Ticket[] });
        }

        this.suggestionState.set('loading');
        return this.ticketService.getSimilarTickets(query).pipe(
          map((items) => ({ state: 'success' as const, items })),
          catchError(() => of({ state: 'error' as const, items: [] as Ticket[] })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((result) => {
      this.suggestionState.set(result.state);
      this.suggestions.set(result.items);
    });
  }

  showError(field: 'title' | 'description' | 'category'): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  fieldError(field: 'title' | 'description'): string {
    const control = this.form.controls[field];
    if (control.hasError('required') || control.hasError('whitespace')) return 'This field is required.';
    if (control.hasError('minlength')) return field === 'title'
      ? 'Use at least 5 characters for a helpful title.'
      : 'Add a little more detail (at least 15 characters).';
    if (control.hasError('maxlength')) return field === 'title'
      ? 'Keep the title under 150 characters.'
      : 'Description cannot exceed 5,000 characters.';
    return '';
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.submitError.set('');
    if (this.form.invalid || this.submitting()) return;

    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.ticketService.createTicket({
      title: value.title.trim(),
      description: value.description.trim(),
      category: value.category,
    }).subscribe({
      next: (ticket) => {
        this.submitting.set(false);
        void this.router.navigate(['/tickets', ticket.id]);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Your ticket could not be submitted. Please check your connection and try again.');
      },
    });
  }

  shortId(id: string): string {
    return `#${id.slice(-6).toUpperCase()}`;
  }
}
