import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideLayoutDashboard, LucidePlus, LucideTicket } from '@lucide/angular';
import { DemoModeService } from './core/services/demo-mode.service';

type TourStep={title:string;description:string;path:string;selector:string;target:string};
@Component({selector:'app-root',standalone:true,imports:[RouterOutlet,RouterLink,RouterLinkActive,LucideLayoutDashboard,LucideTicket,LucidePlus],templateUrl:'./app.html',styleUrl:'./app.css'})
export class App {
 readonly demoMode=inject(DemoModeService);private readonly router=inject(Router);
 readonly tourOpen=signal(false);readonly tourStep=signal(0);
 readonly spotlight=signal({left:0,top:0,width:0,height:0});
 readonly tooltip=signal({left:0,top:0});
 readonly tourSteps:TourStep[]=[
  {title:'Your workspace overview',description:'This is your starting point. The overview gives you a quick read on ticket activity and what needs attention.',path:'/dashboard',selector:'[data-tour="overview"]',target:'Workspace overview'},
  {title:'Create a support request',description:'Use this form to describe the issue and choose the category that best fits. Clear details make it easier for the team to investigate.',path:'/tickets/new',selector:'[data-tour="create-form"]',target:'New ticket form'},
  {title:'AI finds related cases',description:'As you type, ResolveDesk compares your issue with previously resolved tickets. These are useful references, not guaranteed answers.',path:'/tickets/new',selector:'[data-tour="ai-panel"]',target:'AI similar-ticket suggestions'},
  {title:'Find and filter tickets',description:'Search the list and narrow it by status or category. Your selected filters remain in the URL so you can return to the same view.',path:'/tickets',selector:'[data-tour="ticket-filters"]',target:'Search and filters'},
  {title:'Open a ticket',description:'Select a ticket to read the full description, review its status and see the support team's resolution note.',path:'/tickets',selector:'[data-tour="ticket-row"]',target:'Ticket list'}
 ];
 switchRole(role:'user'|'agent'):void{this.demoMode.setRole(role);this.closeTour();void this.router.navigate(['/dashboard']);}
 startTour():void{if(this.demoMode.role()!=='user')return;this.tourStep.set(0);this.tourOpen.set(true);void this.showTourStep(0);}
 closeTour():void{this.tourOpen.set(false);}
 nextTourStep():void{const next=this.tourStep()+1;if(next>=this.tourSteps.length){this.closeTour();return;}this.tourStep.set(next);void this.showTourStep(next);}
 private async showTourStep(index:number):Promise<void>{
  const step=this.tourSteps[index];await this.router.navigateByUrl(step.path);
  window.setTimeout(()=>{const el=(document.querySelector(step.selector) ?? (step.selector==='[data-tour="ticket-row"]'?document.querySelector('[data-tour="ticket-filters"]'):null)) as HTMLElement|null;if(!el){this.closeTour();return;}el.scrollIntoView({behavior:'smooth',block:'center'});window.setTimeout(()=>this.positionTourTarget(el),180);},120);
 }
 private positionTourTarget(el:HTMLElement):void{
  const r=el.getBoundingClientRect(),pad=8;const left=Math.max(8,r.left-pad),top=Math.max(8,r.top-pad),width=Math.min(window.innerWidth-left,r.width+pad*2),height=Math.min(window.innerHeight-top,r.height+pad*2);
  this.spotlight.set({left,top,width,height});
  const cardWidth=Math.min(360,window.innerWidth-32);const tooltipLeft=Math.min(Math.max(16,r.left),window.innerWidth-cardWidth-16);
  const below=r.bottom+24+210<window.innerHeight;const tooltipTop=below?Math.min(window.innerHeight-220,r.bottom+24):Math.max(16,r.top-230);
  this.tooltip.set({left:tooltipLeft,top:tooltipTop});
 }
}
