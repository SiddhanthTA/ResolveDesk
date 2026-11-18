from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .mongo import check_mongodb_connection


@api_view(["GET"])
def health_check(request):
    try:
        check_mongodb_connection()

        return Response({
            "status": "healthy",
            "message": "ResolveDesk API is running",
            "mongodb": "connected"
        })

    except Exception as error:
        return Response({
            "status": "unhealthy",
            "message": "MongoDB connection failed",
            "error": str(error)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)