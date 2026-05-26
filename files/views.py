from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import File
from .serializers import FileSerializer
from api.models import Team, Membership

class IsTeamMemberForFile(permissions.BasePermission):
    """Only allow access if the user is a member of the file's team."""
    def has_permission(self, request, view):
        # For list/create, we'll check team membership in the view
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.team.memberships.filter(user=request.user).exists()

class FileListCreateView(generics.ListCreateAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamMemberForFile]

    def get_queryset(self):
        # Filter files by team, only if user is a member
        team_id = self.kwargs.get('team_pk')
        team = get_object_or_404(Team, id=team_id)
        if not team.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this team.")
        return File.objects.filter(team=team)

    def perform_create(self, serializer):
        team_id = self.kwargs.get('team_pk')
        team = get_object_or_404(Team, id=team_id)
        if not team.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this team.")
        serializer.save(uploaded_by=self.request.user, team=team)

class FileDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamMemberForFile]

    def get_queryset(self):
        # Only files in teams where user is a member
        return File.objects.filter(team__memberships__user=self.request.user)

    def perform_destroy(self, instance):
        # Optional: only admin or uploader can delete
        if instance.uploaded_by != self.request.user:
            if not instance.team.memberships.filter(user=self.request.user, role='admin').exists():
                raise PermissionDenied("Only admin or uploader can delete files.")
        instance.file.delete()  # delete the actual file from disk
        instance.delete()
