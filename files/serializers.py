from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'team', 'uploaded_by', 'file', 'name', 'description', 'uploaded_at']
        read_only_fields = ['uploaded_by', 'uploaded_at', 'team']  # team is set from URL, not request body