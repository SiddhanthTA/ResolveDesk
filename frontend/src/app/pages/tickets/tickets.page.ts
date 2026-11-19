import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCheck,
  LucideChevronDown,
  LucideFilter,
  LucidePlus,
  LucideSearch,
  LucideTag,
  LucideTicket,
} from '@lucide/angular';
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  Ticket,
  TicketCategory,
  TicketFilters,
  TicketStatus,
} from '../../core/models/ticket.model';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { TicketService } from '../../core/services/ticket.service';

type TicketViewKind = 'queue' | 'progress' | 'resolved';

@Component({
  selector: 'app-tickets-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    LucideArrowRight,
    LucideCheck,
    LucideChevronDown,
    LucideFilter,
    LucidePlus,
    LucideSearch,
    LucideTag,
    LucideTicket,
  ],
  templateUrl: './tickets.page.html',
  styleUrl: './tickets.page.css',
})
export class TicketsPage implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly demoMode = inject(DemoModeService);
  readonly categories = TICKET_CATEGORIES;
  readonly statuses = TICKET_STATUSES;
  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly searchTerm = signal('');
  readonly statusFilter = signal<TicketStatus | ''>('');
  readonly categoryFilter = signal<TicketCategory | ''>('');
  readonly defaultStatus = signal<TicketStatus | ''>('');
  readonly viewKind = signal<TicketViewKind>('queue');
  readonly statusMenuOpen = signal(false);
  readonly categoryMenuOpen = signal(false);

  readonly pageTitle = computed(() => {
    if (this.viewKind() === 'progress') return 'In progress tickets';
    if (this.viewKind() === 'resolved') return 'Resolved tickets';
    return this.demoMode.role() === 'agent' ? 'Work queue' : 'My tickets';
  });

  readonly pageDescription = computed(() => {
    if (this.viewKind() === 'progress') return 'Pick up the issues the team has already started investigating.';
    if (this.viewKind() === 'resolved') return 'Review completed requests, with the latest resolutions first.';
    return this.demoMode.role() === 'agent'
      ? 'Review incoming issues and move them towards resolution.'
      : 'Follow your requests and review updates from the support team.';
  });

  readonly listHeading = computed(() => {
    if (this.viewKind() === 'progress') return 'In progress';
    if (this.viewKind() === 'resolved') return 'Resolved tickets';
    return this.demoMode.role() === 'agent' ? 'Support queue' : 'Your requests';
  });

  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let result = this.tickets();

    if (term) {
      result = result.filter((ticket) =>
        [ticket.title, ticket.description, ticket.id, ticket.category]
          .some((value) => value.toLowerCase().includes(term)),
      );
    }

    if (this.viewKind() === 'resolved') {
      return [...result].sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
      );
    }

    return result;
  });

  readonly emptyTitle = computed(() => {
    if (this.searchTerm() || this.categoryFilter() || (this.statusFilter() !== this.defaultStatus())) {
      return 'No tickets match these filters';
    }
    if (this.viewKind() === 'progress') return 'No tickets in progress';
    if (this.viewKind() === 'resolved') return 'No resolved tickets yet';
    return this.demoMode.role() === 'agent' ? 'No open tickets' : 'No tickets yet';
  });

  readonly emptyDescription = computed(() => {
    if (this.searchTerm() || this.categoryFilter() || (this.statusFilter() !== this.defaultStatus())) {
      return 'Try adjusting your search or filters.';
    }
    if (this.viewKind() === 'progress') return 'Tickets automatically appear here when an agent opens them.';
    if (this.viewKind() === 'resolved') return 'Resolved requests will be listed here, newest resolution first.';
    return this.demoMode.role() === 'agent'
      ? 'The queue is clear. New requests will appear here.'
      : 'Your submitted requests will appear here.';
  });

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap;
    const queryStatus = query.get('status');
    const routeView = this.route.snapshot.data['viewKind'] as TicketViewKind | undefined;
    const routeDefault = this.route.snapshot.data['defaultStatus'] as TicketStatus | undefined;

    this.viewKind.set(routeView ?? 'queue');
    this.defaultStatus.set(routeDefault ?? (this.demoMode.role() === 'agent' ? 'Open' : ''));
    this.statusFilter.set(
      queryStatus === null
        ? this.defaultStatus()
        : queryStatus === '__all__'
          ? ''
          : (queryStatus as TicketStatus),
    );
    this.categoryFilter.set((query.get('category') as TicketCategory | null) ?? '');
    this.searchTerm.set(query.get('q') ?? '');

    this.loadTickets();
    this.syncQuery();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.statusMenuOpen.set(false);
    this.categoryMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeMenusOnEscape(): void {
    this.closeMenus();
  }

  toggleStatusMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.categoryMenuOpen.set(false);
    this.statusMenuOpen.update((open) => !open);
  }

  toggleCategoryMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.statusMenuOpen.set(false);
    this.categoryMenuOpen.update((open) => !open);
  }

  selectStatus(status: TicketStatus | ''): void {
    this.statusFilter.set(status);
    this.closeMenus();
    this.syncQuery();
    this.loadTickets();
  }

  selectCategory(category: TicketCategory | ''): void {
    this.categoryFilter.set(category);
    this.closeMenus();
    this.syncQuery();
    this.loadTickets();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.syncQuery();
  }

  clearFilters(): void {
    this.statusFilter.set(this.defaultStatus());
    this.categoryFilter.set('');
    this.searchTerm.set('');
    this.syncQuery();
    this.loadTickets();
  }

  private syncQuery(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: this.statusFilter() || '__all__',
        category: this.categoryFilter() || null,
        q: this.searchTerm() || null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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

  statusLabel(): string {
    return this.statusFilter() || 'All statuses';
  }

  categoryLabel(): string {
    return this.categoryFilter() || 'All categories';
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
