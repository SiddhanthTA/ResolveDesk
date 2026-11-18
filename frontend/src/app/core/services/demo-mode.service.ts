import { Injectable, signal } from '@angular/core';
import { DemoRole } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class DemoModeService {
  readonly role = signal<DemoRole>('agent');

  toggleRole(): void {
    this.role.update((current) => (current === 'agent' ? 'user' : 'agent'));
  }

  setRole(role: DemoRole): void {
    this.role.set(role);
  }
}
