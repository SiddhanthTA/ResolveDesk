from django.urls import path

from .views import (
    HealthCheckView,
    SeedResolvedDemoTicketsView,
    DeleteAllTicketsView,
    SimilarTicketSuggestionsView,
    TicketDetailView,
    TicketReplyView,
    TicketListCreateView,
)


urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("dev/seed-resolved-tickets/", SeedResolvedDemoTicketsView.as_view(), name="dev-seed-resolved-tickets"),
    path("dev/delete-all-tickets/", DeleteAllTicketsView.as_view(), name="dev-delete-all-tickets"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/similar/", SimilarTicketSuggestionsView.as_view(), name="similar-ticket-suggestions"),
    path("tickets/<str:ticket_id>/replies/", TicketReplyView.as_view(), name="ticket-replies"),
    path("tickets/<str:ticket_id>/", TicketDetailView.as_view(), name="ticket-detail"),
]
