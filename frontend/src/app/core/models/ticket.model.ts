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
  replies: TicketReply[];
  customer_reply_count: number;
  agent_reply_count: number;
  last_reply_at: string | null;
  last_reply_by: 'user' | 'agent' | null;
  next_reply_by: 'user' | 'agent' | null;
  is_reopened: boolean;
  rating: number | null;
  rating_note: string;
  rating_created_at: string | null;
  rating_seen_by_agent: boolean;
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

export interface TicketReply {
  sender_role: 'user' | 'agent';
  message: string;
  created_at: string;
}

export interface CreateTicketReplyRequest {
  sender_role: 'user' | 'agent';
  message: string;
}

export interface TicketRatingRequest {
  rating: number;
  note: string;
}
