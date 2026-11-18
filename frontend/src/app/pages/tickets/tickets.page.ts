import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideFilter, LucidePlus, LucideSearch, LucideTicket } from '@lucide/angular';
import { TICKET_CATEGORIES, TICKET_STATUSES, Ticket, TicketCategory, TicketFilters, TicketStatus } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';

@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideArrowRight, LucideFilter, LucidePlus, LucideSearch, LucideTicket],
  templateUrl: './tickets.page.html',
  styleUrl: './tickets.page.css',
})
export class TicketsPage implements OnInit {
  private readonly ticketService = inject(TicketService);

  readonly categories = TICKET_CATEGORIES;
  readonly statuses = TICKET_STATUSES;
  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly searchTerm = signal('');
  readonly statusFilter = signal<TicketStatus | ''>('');
  readonly categoryFilter = signal<TicketCategory | ''>('');
  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.tickets();
    return this.tickets().filter((ticket) =>
      [ticket.title, ticket.description, ticket.id, ticket.category]
        .some((value) => value.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set('');
    const filters: TicketFilters = {
      status: this.statusFilter(),
      category: this.categoryFilter(),
    };
    this.ticketService.getTickets(filters).subscribe({
      next: (response) => {
        this.tickets.set(response.results);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Tickets could not be loaded. Make sure the Django API and MongoDB are running.');
        this.loading.set(false);
      },
    });
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as TicketStatus | '');
    this.loadTickets();
  }

  onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value as TicketCategory | '');
    this.loadTickets();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.searchTerm.set('');
    this.loadTickets();
  }

  statusClass(status: TicketStatus): string {
    return status === 'Resolved' ? 'status-resolved' : status === 'In Progress' ? 'status-progress' : 'status-open';
  }

  shortId(id: string): string {
    return `#${id.slice(-6).toUpperCase()}`;
  }
}
