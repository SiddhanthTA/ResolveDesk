from rest_framework import serializers


TICKET_CATEGORIES = ("Account", "Technical", "Billing", "General")
TICKET_STATUSES = ("Open", "In Progress", "Resolved")


class TicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, trim_whitespace=True)
    description = serializers.CharField(max_length=5000, trim_whitespace=True)
    category = serializers.ChoiceField(choices=TICKET_CATEGORIES)

    def validate_title(self, value):
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_description(self, value):
        if not value:
            raise serializers.ValidationError("Description cannot be empty.")
        return value


class TicketUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TICKET_STATUSES, required=False)
    resolution_note = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one field to update."
            )

        current_status = self.instance.get("status") if self.instance else None
        new_status = attrs.get("status", current_status)
        resolution_note = attrs.get(
            "resolution_note",
            self.instance.get("resolution_note") if self.instance else None,
        )

        if new_status == "Resolved" and not resolution_note:
            raise serializers.ValidationError({
                "resolution_note": "A resolution note is required when resolving a ticket."
            })

        return attrs



class TicketResponseSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    category = serializers.CharField()
    status = serializers.CharField()
    resolution_note = serializers.CharField(allow_null=True, allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class TicketListResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = TicketResponseSerializer(many=True)
