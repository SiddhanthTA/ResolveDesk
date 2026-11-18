from django.urls import path

from .views import (
    HealthCheckView,
    SimilarTicketSuggestionsView,
    TicketDetailView,
    TicketListCreateView,
)


urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/similar/", SimilarTicketSuggestionsView.as_view(), name="similar-ticket-suggestions"),
    path("tickets/<str:ticket_id>/", TicketDetailView.as_view(), name="ticket-detail"),
]
