import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCircleCheck, LucidePlus, LucideSparkles, LucideTicket } from '@lucide/angular';
import { Ticket, TicketStatus } from '../../core/models/ticket.model';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { TicketService } from '../../core/services/ticket.service';
@Component({selector:'app-dashboard-page',standalone:true,imports:[DatePipe,RouterLink,LucideArrowRight,LucideCircleCheck,LucidePlus,LucideSparkles,LucideTicket],templateUrl:'./dashboard.page.html',styleUrl:'./dashboard.page.css'})
export class DashboardPage implements OnInit {
 private readonly ticketService=inject(TicketService);
 readonly demoMode=inject(DemoModeService);
 readonly tickets=signal<Ticket[]>([]);readonly loading=signal(true);readonly error=signal('');
 readonly total=computed(()=>this.tickets().length);readonly openCount=computed(()=>this.countByStatus('Open'));readonly progressCount=computed(()=>this.countByStatus('In Progress'));readonly resolvedCount=computed(()=>this.countByStatus('Resolved'));
 readonly recentTickets=computed(()=>this.demoMode.role()==='agent'?this.tickets().filter(t=>t.status==='Open').slice(0,6):this.tickets().slice(0,5));
 ngOnInit():void{this.refresh();}
 refresh():void{this.loading.set(true);this.error.set('');this.ticketService.getTickets().subscribe({next:r=>{this.tickets.set(r.results);this.loading.set(false);},error:()=>{this.error.set('We could not load tickets. Check that the API and MongoDB are running, then try again.');this.loading.set(false);}});}
 countByStatus(status:TicketStatus):number{return this.tickets().filter(t=>t.status===status).length;}
 share(status:TicketStatus):number{return this.total()?(this.countByStatus(status)/this.total())*100:0;}
 statusClass(status:TicketStatus):string{return status==='Resolved'?'status-resolved':status==='In Progress'?'status-progress':'status-open';}
}
