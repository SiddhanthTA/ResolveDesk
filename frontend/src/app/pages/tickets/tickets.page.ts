import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideFilter, LucidePlus, LucideSearch, LucideTicket } from '@lucide/angular';
import { TICKET_CATEGORIES,TICKET_STATUSES,Ticket,TicketCategory,TicketFilters,TicketStatus } from '../../core/models/ticket.model';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { TicketService } from '../../core/services/ticket.service';
@Component({selector:'app-tickets-page',standalone:true,imports:[DatePipe,RouterLink,LucideArrowRight,LucideFilter,LucidePlus,LucideSearch,LucideTicket],templateUrl:'./tickets.page.html',styleUrl:'./tickets.page.css'})
export class TicketsPage implements OnInit {
 private readonly ticketService=inject(TicketService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);readonly demoMode=inject(DemoModeService);
 readonly categories=TICKET_CATEGORIES;readonly statuses=TICKET_STATUSES;readonly tickets=signal<Ticket[]>([]);readonly loading=signal(true);readonly error=signal('');readonly searchTerm=signal('');readonly statusFilter=signal<TicketStatus|''>('');readonly categoryFilter=signal<TicketCategory|''>('');
 readonly filteredTickets=computed(()=>{const term=this.searchTerm().trim().toLowerCase();return term?this.tickets().filter(t=>[t.title,t.description,t.id,t.category].some(v=>v.toLowerCase().includes(term))):this.tickets();});
 ngOnInit():void{const q=this.route.snapshot.queryParamMap;this.statusFilter.set((q.get('status') as TicketStatus|null)??(this.demoMode.role()==='agent'?'Open':''));this.categoryFilter.set((q.get('category') as TicketCategory|null)??'');this.searchTerm.set(q.get('q')??'');this.loadTickets();this.syncQuery();}
 private syncQuery():void{void this.router.navigate([], {relativeTo:this.route,queryParams:{status:this.statusFilter()||null,category:this.categoryFilter()||null,q:this.searchTerm()||null},queryParamsHandling:'merge',replaceUrl:true});}
 loadTickets():void{this.loading.set(true);this.error.set('');const filters:TicketFilters={status:this.statusFilter(),category:this.categoryFilter()};this.ticketService.getTickets(filters).subscribe({next:r=>{this.tickets.set(r.results);this.loading.set(false);},error:()=>{this.error.set('Tickets could not be loaded. Make sure the Django API and MongoDB are running.');this.loading.set(false);}});}
 onStatusChange(e:Event):void{this.statusFilter.set((e.target as HTMLSelectElement).value as TicketStatus|'');this.syncQuery();this.loadTickets();}
 onCategoryChange(e:Event):void{this.categoryFilter.set((e.target as HTMLSelectElement).value as TicketCategory|'');this.syncQuery();this.loadTickets();}
 onSearch(e:Event):void{this.searchTerm.set((e.target as HTMLInputElement).value);this.syncQuery();}
 clearFilters():void{this.statusFilter.set('');this.categoryFilter.set('');this.searchTerm.set('');this.syncQuery();this.loadTickets();}
 statusClass(s:TicketStatus):string{return s==='Resolved'?'status-resolved':s==='In Progress'?'status-progress':'status-open';}
 shortId(id:string):string{return '#'+id.slice(-6).toUpperCase();}
}
