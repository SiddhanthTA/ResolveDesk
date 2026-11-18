from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .mongo import check_mongodb_connection
from .repositories import ticket_repository
from .serializers import (
    TicketCreateSerializer,
    TicketListResponseSerializer,
    TicketResponseSerializer,
    TicketUpdateSerializer,
)


class HealthCheckView(APIView):
    @extend_schema(
        summary="Check API and MongoDB health",
        responses={200: dict, 503: dict},
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
        responses={201: TicketResponseSerializer, 400: dict, 503: dict},
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
        responses={200: TicketResponseSerializer, 404: dict, 503: dict},
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
        responses={200: TicketResponseSerializer, 400: dict, 404: dict, 503: dict},
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
