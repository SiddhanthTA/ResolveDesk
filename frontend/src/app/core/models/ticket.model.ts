export const TICKET_CATEGORIES = ['Account', 'Technical', 'Billing', 'General'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  similarity_score?: number;
}

export interface TicketListResponse {
  count: number;
  results: Ticket[];
}

export interface TicketFilters {
  status?: TicketStatus | '';
  category?: TicketCategory | '';
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: TicketCategory;
}

export interface SimilarTicketRequest {
  title: string;
  description: string;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  resolution_note?: string;
}

export type DemoRole = 'user' | 'agent';
