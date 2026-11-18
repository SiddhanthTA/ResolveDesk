import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideCircleHelp, LucideLayoutDashboard, LucidePlus, LucideTicket } from '@lucide/angular';
import { DemoModeService } from './core/services/demo-mode.service';

@Component({selector:'app-root',standalone:true,imports:[RouterOutlet,RouterLink,RouterLinkActive,LucideLayoutDashboard,LucideTicket,LucidePlus,LucideCircleHelp],templateUrl:'./app.html',styleUrl:'./app.css'})
export class App {
  readonly demoMode=inject(DemoModeService);
  readonly tourOpen=signal(false);
  readonly tourStep=signal(0);
  readonly tourSteps=[
    {title:'Your workspace overview',description:'A role-aware home base. End users can track their requests; agents get a live view of the work waiting in the queue.',target:'Overview · sidebar navigation'},
    {title:'Create a support request',description:'End users describe the issue, choose a category and submit it. Agents focus on reviewing and resolving requests rather than creating their own.',target:'Create ticket · end-user navigation'},
    {title:'AI-powered similar cases',description:'While an end user writes a request, ResolveDesk compares its wording with resolved tickets and surfaces up to three potentially useful matches. These are suggestions, not guaranteed answers.',target:'AI suggestions · new ticket form'},
    {title:'Your ticket list',description:'Search by issue details and narrow the list by status or category. Agents land on Open tickets first, but can switch to any status or the full queue.',target:'My tickets / Work queue · sidebar navigation'},
    {title:'Ticket details and resolution',description:'Open a ticket to read its full context. Agents can move it through Open, In Progress and Resolved, adding a resolution note when closing it.',target:'Ticket details · select any row'}
  ];
  switchRole(role:'user'|'agent'):void{this.demoMode.setRole(role);if(this.router.url.startsWith('/tickets/new')&&role==='agent')void this.router.navigate(['/dashboard']);}
  private readonly router=inject(Router);
  startTour():void{this.tourStep.set(0);this.tourOpen.set(true);}
  closeTour():void{this.tourOpen.set(false);}
  nextTourStep():void{if(this.tourStep()===this.tourSteps.length-1){this.closeTour();return;}this.tourStep.update(s=>s+1);}
}
