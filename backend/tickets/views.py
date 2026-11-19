from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .mongo import check_mongodb_connection
from .repositories import ticket_repository
from .serializers import (
    TicketCreateSerializer,
    TicketListResponseSerializer,
    TicketResponseSerializer,
    TicketUpdateSerializer,
    SimilarTicketRequestSerializer,
    SimilarTicketResponseSerializer,
    DeleteAllTicketsConfirmationSerializer,
    TicketReplyCreateSerializer,
    TicketRatingCreateSerializer,
)

from .services.similarity_service import find_similar_resolved_tickets
from .demo_data import DEMO_BATCH_KEY, build_resolved_demo_tickets


class HealthCheckView(APIView):
    @extend_schema(
        summary="Check API and MongoDB health",
        responses={200: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def get(self, request):
        try:
            check_mongodb_connection()
            return Response({
                "status": "healthy",
                "message": "ResolveDesk API is running",
                "mongodb": "connected",
            })
        except Exception:
            return Response({
                "status": "unhealthy",
                "message": "MongoDB connection failed",
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class TicketListCreateView(APIView):
    @extend_schema(
        summary="List tickets",
        description="Optionally filter tickets by status and category.",
        parameters=[
            OpenApiParameter(
                name="status",
                type=str,
                location=OpenApiParameter.QUERY,
                enum=["Open", "In Progress", "Resolved"],
                required=False,
            ),
            OpenApiParameter(
                name="category",
                type=str,
                location=OpenApiParameter.QUERY,
                enum=["Account", "Technical", "Billing", "General"],
                required=False,
            ),
        ],
        responses={200: TicketListResponseSerializer},
    )
    def get(self, request):
        filters = {}
        ticket_status = request.query_params.get("status")
        category = request.query_params.get("category")

        valid_statuses = ("Open", "In Progress", "Resolved")
        valid_categories = ("Account", "Technical", "Billing", "General")

        if ticket_status:
            if ticket_status not in valid_statuses:
                return Response(
                    {"status": [f"Choose one of: {', '.join(valid_statuses)}."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filters["status"] = ticket_status

        if category:
            if category not in valid_categories:
                return Response(
                    {"category": [f"Choose one of: {', '.join(valid_categories)}."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filters["category"] = category

        try:
            tickets = ticket_repository.list_tickets(filters)
            return Response({"count": len(tickets), "results": tickets})
        except Exception:
            return Response(
                {"detail": "Unable to retrieve tickets right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @extend_schema(
        summary="Create a ticket",
        request=TicketCreateSerializer,
        responses={201: TicketResponseSerializer, 400: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = TicketCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = ticket_repository.create_ticket(serializer.validated_data)
            return Response(ticket, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(
                {"detail": "Unable to create the ticket right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class TicketDetailView(APIView):
    @extend_schema(
        summary="Retrieve a ticket",
        responses={200: TicketResponseSerializer, 404: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def get(self, request, ticket_id):
        try:
            ticket = ticket_repository.get_ticket_by_id(ticket_id)
            if ticket is None:
                return Response(
                    {"detail": "Ticket not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(ticket)
        except Exception:
            return Response(
                {"detail": "Unable to retrieve the ticket right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @extend_schema(
        summary="Update ticket status or resolution note",
        request=TicketUpdateSerializer,
        responses={200: TicketResponseSerializer, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def patch(self, request, ticket_id):
        try:
            existing_ticket = ticket_repository.get_ticket_by_id(ticket_id)
            if existing_ticket is None:
                return Response(
                    {"detail": "Ticket not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = TicketUpdateSerializer(
                data=request.data,
                instance=existing_ticket,
                partial=True,
            )
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST,
                )

            updated_ticket = ticket_repository.update_ticket(
                ticket_id,
                serializer.validated_data,
            )
            return Response(updated_ticket)
        except Exception:
            return Response(
                {"detail": "Unable to update the ticket right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class SimilarTicketSuggestionsView(APIView):
    @extend_schema(
        summary="Suggest similar resolved tickets",
        description=(
            "Uses a locally running Sentence Transformers model to rank up to "
            "three resolved tickets by cosine similarity. Scores are similarity "
            "measures, not probabilities or guarantees."
        ),
        request=SimilarTicketRequestSerializer,
        responses={200: SimilarTicketResponseSerializer(many=True), 400: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = SimilarTicketRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            suggestions = find_similar_resolved_tickets(
                title=serializer.validated_data["title"],
                description=serializer.validated_data["description"],
                limit=3,
            )
            return Response(suggestions)
        except Exception:
            return Response(
                {"detail": "Unable to generate similar-ticket suggestions right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class DevelopmentOnlyAPIView(APIView):
    """Hide destructive/demo utilities outside local development."""

    def initial(self, request, *args, **kwargs):
        if not settings.DEBUG:
            raise Http404
        return super().initial(request, *args, **kwargs)


class SeedResolvedDemoTicketsView(DevelopmentOnlyAPIView):
    @extend_schema(
        summary="Seed 25 realistic resolved demo tickets",
        description=(
            "Development-only utility. Inserts 25 resolved examples across Account, "
            "Technical, Billing and General. Re-running replaces only this endpoint's "
            "previous demo batch and leaves other tickets untouched. Available only "
            "when Django DEBUG=True."
        ),
        request=None,
        responses={201: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        try:
            inserted = ticket_repository.replace_demo_seed_tickets(
                build_resolved_demo_tickets(),
                DEMO_BATCH_KEY,
            )
            return Response({
                "message": "Resolved demo tickets are ready.",
                "inserted": inserted,
                "categories": {
                    "Account": 7,
                    "Technical": 6,
                    "Billing": 6,
                    "General": 6,
                },
                "note": "Only the previous ResolveDesk demo batch was replaced. Other tickets were preserved.",
            }, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(
                {"detail": "Unable to seed resolved demo tickets. Check the MongoDB connection."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class DeleteAllTicketsView(DevelopmentOnlyAPIView):
    @extend_schema(
        summary="DELETE ALL tickets (development only)",
        description=(
            "Destructive development-only utility. Deletes every ticket in the MongoDB "
            "tickets collection, including user-created and seeded tickets. The request "
            "must include confirmation='DELETE ALL TICKETS'. Available only when "
            "Django DEBUG=True."
        ),
        request=DeleteAllTicketsConfirmationSerializer,
        responses={200: OpenApiTypes.OBJECT, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def post(self, request):
        serializer = DeleteAllTicketsConfirmationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            deleted = ticket_repository.delete_all_tickets()
            return Response({
                "message": "Ticket collection cleared.",
                "deleted": deleted,
            })
        except Exception:
            return Response(
                {"detail": "Unable to delete tickets. Check the MongoDB connection."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class TicketReplyView(APIView):
    @extend_schema(
        summary="Add a customer or agent reply to a ticket",
        description=(
            "Adds a message to the ticket conversation. Each demo role may send up to "
            "five replies per ticket. A customer reply automatically reopens a resolved "
            "ticket. Replies never overwrite the original resolution note. The sender "
            "role is part of this demo API and is not authentication."
        ),
        request=TicketReplyCreateSerializer,
        responses={201: TicketResponseSerializer, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 409: OpenApiTypes.OBJECT, 503: OpenApiTypes.OBJECT},
    )
    def post(self, request, ticket_id):
        serializer = TicketReplyCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            ticket, result = ticket_repository.append_ticket_reply(
                ticket_id,
                serializer.validated_data["sender_role"],
                serializer.validated_data["message"],
            )
            if result == "not_found":
                return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
            if result == "limit_reached":
                return Response({"detail": "This side has already used all five replies for this ticket."}, status=status.HTTP_409_CONFLICT)
            if result == "not_your_turn":
                return Response({"detail": "Please wait for the other side to reply before sending another message."}, status=status.HTTP_409_CONFLICT)
            return Response(ticket, status=status.HTTP_201_CREATED)
        except Exception:
            return Response({"detail": "Unable to add the reply right now."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)



class TicketReopenView(APIView):
    @extend_schema(
        summary="Reopen a resolved ticket",
        description="Reopens a resolved ticket, clears any customer rating, and starts a new follow-up conversation.",
        request=None,
        responses={200: TicketResponseSerializer, 404: OpenApiTypes.OBJECT, 409: OpenApiTypes.OBJECT},
    )
    def post(self, request, ticket_id):
        try:
            ticket, result = ticket_repository.reopen_ticket(ticket_id)
            if result == "not_found":
                return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
            if result == "not_resolved":
                return Response({"detail": "Only resolved tickets can be reopened."}, status=status.HTTP_409_CONFLICT)
            return Response(ticket)
        except Exception:
            return Response({"detail": "Unable to reopen this ticket right now."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class TicketRatingView(APIView):
    @extend_schema(
        summary="Save customer satisfaction feedback",
        request=TicketRatingCreateSerializer,
        responses={200: TicketResponseSerializer, 400: OpenApiTypes.OBJECT, 404: OpenApiTypes.OBJECT, 409: OpenApiTypes.OBJECT},
    )
    def post(self, request, ticket_id):
        serializer = TicketRatingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            ticket, result = ticket_repository.save_ticket_rating(
                ticket_id,
                serializer.validated_data["rating"],
                serializer.validated_data["note"],
            )
            if result == "not_found":
                return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
            if result == "not_resolved":
                return Response({"detail": "Only resolved tickets can receive a rating."}, status=status.HTTP_409_CONFLICT)
            return Response(ticket)
        except Exception:
            return Response({"detail": "Unable to save the rating right now."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class TicketRatingSeenView(APIView):
    @extend_schema(
        summary="Mark a customer rating as seen by an agent",
        request=None,
        responses={200: TicketResponseSerializer, 404: OpenApiTypes.OBJECT},
    )
    def post(self, request, ticket_id):
        try:
            ticket = ticket_repository.mark_ticket_rating_seen(ticket_id)
            if ticket is None:
                return Response({"detail": "Ticket not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(ticket)
        except Exception:
            return Response({"detail": "Unable to update the rating status right now."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
