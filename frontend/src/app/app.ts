import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideCircleHelp,
  LucideLayoutDashboard,
  LucidePlus,
  LucideSettings,
  LucideTicket,
} from '@lucide/angular';
import { DemoModeService } from './core/services/demo-mode.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideLayoutDashboard,
    LucideTicket,
    LucidePlus,
    LucideBell,
    LucideCircleHelp,
    LucideSettings,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly demoMode = inject(DemoModeService);

}
