import { Routes } from '@angular/router';
import { DashboardPage } from './pages/dashboard/dashboard.page';
import { TicketsPage } from './pages/tickets/tickets.page';
import { CreateTicketPage } from './pages/create-ticket/create-ticket.page';
import { TicketDetailPage } from './pages/ticket-detail/ticket-detail.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPage, title: 'Overview · ResolveDesk' },
  { path: 'tickets/new', component: CreateTicketPage, title: 'Create ticket · ResolveDesk' },
  { path: 'tickets', component: TicketsPage, title: 'All tickets · ResolveDesk' },
  { path: 'tickets/:id', component: TicketDetailPage, title: 'Ticket details · ResolveDesk' },
  { path: '**', redirectTo: 'dashboard' },
];
