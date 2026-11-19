import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateTicketRequest,
  CreateTicketReplyRequest,
  SimilarTicketRequest,
  Ticket,
  TicketFilters,
  TicketListResponse,
  TicketRatingRequest,
  UpdateTicketRequest,
} from '../models/ticket.model';

import { environment } from '../../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);

  getTickets(filters: TicketFilters = {}): Observable<TicketListResponse> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.category) params = params.set('category', filters.category);

    return this.http.get<TicketListResponse>(API_BASE_URL + '/tickets/', { params });
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/');
  }

  createTicket(payload: CreateTicketRequest): Observable<Ticket> {
    return this.http.post<Ticket>(API_BASE_URL + '/tickets/', payload);
  }

  updateTicket(id: string, payload: UpdateTicketRequest): Observable<Ticket> {
    return this.http.patch<Ticket>(
      API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/',
      payload,
    );
  }

  addReply(id: string, payload: CreateTicketReplyRequest): Observable<Ticket> {
    return this.http.post<Ticket>(
      API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/replies/',
      payload,
    );
  }

  reopenTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(
      API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/reopen/',
      {},
    );
  }

  saveRating(id: string, payload: TicketRatingRequest): Observable<Ticket> {
    return this.http.post<Ticket>(
      API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/rating/',
      payload,
    );
  }

  markRatingSeen(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(
      API_BASE_URL + '/tickets/' + encodeURIComponent(id) + '/rating/seen/',
      {},
    );
  }

  getSimilarTickets(payload: SimilarTicketRequest): Observable<Ticket[]> {
    return this.http.post<Ticket[]>(API_BASE_URL + '/tickets/similar/', payload);
  }
}
