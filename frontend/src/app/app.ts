import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCircleCheck,
  LucideClock3,
  LucideLayoutDashboard,
  LucidePlus,
  LucideTicket,
} from '@lucide/angular';
import { Ticket } from './core/models/ticket.model';
import { DemoModeService } from './core/services/demo-mode.service';
import { TicketService } from './core/services/ticket.service';

interface TourStep {
  title: string;
  description: string;
  path: string;
  selector: string;
  target: string;
}

interface TicketNotice {
  tickets: Ticket[];
  total: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideCircleCheck,
    LucideClock3,
    LucideLayoutDashboard,
    LucidePlus,
    LucideTicket,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly demoMode = inject(DemoModeService);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private agentSessionStartedAt: number | null = null;

  readonly resolutionNotice = signal<TicketNotice | null>(null);
  readonly replyNotice = signal<TicketNotice | null>(null);
  readonly tourOpen = signal(false);
  readonly tourStep = signal(0);
  readonly spotlight = signal({ left: 0, top: 0, width: 0, height: 0 });
  readonly tooltip = signal({ left: 0, top: 0 });

  readonly tourSteps: TourStep[] = [
    {
      title: 'Your workspace overview',
      description: 'This is your starting point. The overview gives you a quick read on ticket activity and what needs attention.',
      path: '/dashboard',
      selector: '[data-tour="overview"]',
      target: 'Workspace overview',
    },
    {
      title: 'Create a support request',
      description: 'Use this form to describe the issue and choose the category that best fits. Clear details make it easier for the team to investigate.',
      path: '/tickets/new',
      selector: '[data-tour="create-form"]',
      target: 'New ticket form',
    },
    {
      title: 'AI finds related cases',
      description: 'As you type, ResolveDesk compares your issue with previously resolved tickets. These are useful references, not guaranteed answers.',
      path: '/tickets/new',
      selector: '[data-tour="ai-panel"]',
      target: 'AI similar-ticket suggestions',
    },
    {
      title: 'Find and filter tickets',
      description: 'Search the list and narrow it by status or category. Your selected filters remain in the URL so you can return to the same view.',
      path: '/tickets',
      selector: '[data-tour="ticket-filters"]',
      target: 'Search and filters',
    },
    {
      title: 'Open a ticket',
      description: 'Select a ticket to read the full description, review its status and see the support team\'s resolution note.',
      path: '/tickets',
      selector: '[data-tour="ticket-row"]',
      target: 'Ticket list',
    },
  ];

  switchRole(role: 'user' | 'agent'): void {
    const previousRole = this.demoMode.role();
    if (previousRole === role) return;

    if (previousRole === 'user' && role === 'agent') {
      this.agentSessionStartedAt = Date.now();
      this.resolutionNotice.set(null);
      this.replyNotice.set(null);
    }

    this.demoMode.setRole(role);
    this.closeTour();
    void this.router.navigate(['/dashboard']);

    if (previousRole === 'agent' && role === 'user' && this.agentSessionStartedAt !== null) {
      const sessionStartedAt = this.agentSessionStartedAt;
      this.agentSessionStartedAt = null;
      this.loadSupportNotices(sessionStartedAt);
    }
  }

  private loadSupportNotices(sessionStartedAt: number): void {
    this.ticketService.getTickets().subscribe({
      next: (response) => {
        if (this.demoMode.role() !== 'user') return;

        const newlyResolved = response.results
          .filter((ticket) => ticket.status === 'Resolved' && Date.parse(ticket.updated_at) >= sessionStartedAt)
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

        const newAgentReplies = response.results
          .filter((ticket) => ticket.last_reply_by === 'agent' && !!ticket.last_reply_at
            && Date.parse(ticket.last_reply_at) >= sessionStartedAt)
          .sort((a, b) => Date.parse(b.last_reply_at ?? '') - Date.parse(a.last_reply_at ?? ''));

        this.resolutionNotice.set(newlyResolved.length ? {
          tickets: newlyResolved.slice(0, 3),
          total: newlyResolved.length,
        } : null);

        this.replyNotice.set(newAgentReplies.length ? {
          tickets: newAgentReplies.slice(0, 3),
          total: newAgentReplies.length,
        } : null);
      },
    });
  }

  dismissResolutionNotice(): void {
    this.resolutionNotice.set(null);
  }

  dismissReplyNotice(): void {
    this.replyNotice.set(null);
  }

  startTour(): void {
    if (this.demoMode.role() !== 'user') return;
    this.tourStep.set(0);
    this.tourOpen.set(true);
    void this.showTourStep(0);
  }

  closeTour(): void {
    this.tourOpen.set(false);
  }

  nextTourStep(): void {
    const next = this.tourStep() + 1;
    if (next >= this.tourSteps.length) {
      this.closeTour();
      return;
    }
    this.tourStep.set(next);
    void this.showTourStep(next);
  }

  private async showTourStep(index: number): Promise<void> {
    const step = this.tourSteps[index];
    await this.router.navigateByUrl(step.path);
    window.setTimeout(() => {
      const el = (
        document.querySelector(step.selector) ??
        (step.selector === '[data-tour="ticket-row"]'
          ? document.querySelector('[data-tour="ticket-filters"]')
          : null)
      ) as HTMLElement | null;

      if (!el) {
        this.closeTour();
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => this.positionTourTarget(el), 180);
    }, 120);
  }

  private positionTourTarget(el: HTMLElement): void {
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const left = Math.max(8, rect.left - padding);
    const top = Math.max(8, rect.top - padding);
    const width = Math.min(window.innerWidth - left, rect.width + padding * 2);
    const height = Math.min(window.innerHeight - top, rect.height + padding * 2);
    this.spotlight.set({ left, top, width, height });

    const cardWidth = Math.min(360, window.innerWidth - 32);
    const tooltipLeft = Math.min(Math.max(16, rect.left), window.innerWidth - cardWidth - 16);
    const below = rect.bottom + 24 + 210 < window.innerHeight;
    const tooltipTop = below
      ? Math.min(window.innerHeight - 220, rect.bottom + 24)
      : Math.max(16, rect.top - 230);
    this.tooltip.set({ left: tooltipLeft, top: tooltipTop });
  }
}
