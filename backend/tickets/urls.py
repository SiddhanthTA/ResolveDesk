from django.urls import path

from .views import (
    HealthCheckView,
    SeedResolvedDemoTicketsView,
    DeleteAllTicketsView,
    SimilarTicketSuggestionsView,
    TicketDetailView,
    TicketReplyView,
    TicketReopenView,
    TicketRatingView,
    TicketRatingSeenView,
    TicketCloseRequestView,
    TicketResolveView,
    TicketForceResolveView,
    TicketListCreateView,
)


urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dev/seed-resolved-tickets/", SeedResolvedDemoTicketsView.as_view(), name="dev-seed-resolved-tickets"),
    path("dev/delete-all-tickets/", DeleteAllTicketsView.as_view(), name="dev-delete-all-tickets"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/similar/", SimilarTicketSuggestionsView.as_view(), name="similar-ticket-suggestions"),
    path("tickets/<str:ticket_id>/replies/", TicketReplyView.as_view(), name="ticket-replies"),
    path("tickets/<str:ticket_id>/reopen/", TicketReopenView.as_view(), name="ticket-reopen"),
    path("tickets/<str:ticket_id>/rating/", TicketRatingView.as_view(), name="ticket-rating"),
    path("tickets/<str:ticket_id>/rating/seen/", TicketRatingSeenView.as_view(), name="ticket-rating-seen"),
    path("tickets/<str:ticket_id>/close-request/", TicketCloseRequestView.as_view(), name="ticket-close-request"),
    path("tickets/<str:ticket_id>/resolve/", TicketResolveView.as_view(), name="ticket-resolve"),
    path("tickets/<str:ticket_id>/force-resolve/", TicketForceResolveView.as_view(), name="ticket-force-resolve"),
    path("tickets/<str:ticket_id>/", TicketDetailView.as_view(), name="ticket-detail"),
]
