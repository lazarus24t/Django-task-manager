from rest_framework import generics, status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import User, Team, Membership, Task
from .serializers import RegisterSerializer, TeamSerializer, MembershipSerializer, TaskSerializer
from .permissions import IsTeamMember

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": RegisterSerializer(user).data,
            "message": "User created successfully",
        }, status=status.HTTP_201_CREATED)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Task.objects.filter(team__memberships__user=user)

    def perform_create(self, serializer):
        team_data = serializer.validated_data.get('team')
        # team_data might be the Team object or its ID
        if isinstance(team_data, Team):
            team = team_data
        else:
            team = get_object_or_404(Team, id=team_data)

        if not team.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this team.")
        
        serializer.save(created_by=self.request.user)
class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsTeamMember]

    def get_queryset(self):
        user = self.request.user
        return Task.objects.filter(team__memberships__user=user)
class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only teams the user is a member of
        user = self.request.user
        return Team.objects.filter(memberships__user=user)

    def perform_create(self, serializer):
        # Set the creator and automatically add them as admin member
        team = serializer.save(created_by=self.request.user)
        Membership.objects.create(
            user=self.request.user,
            team=team,
            role='admin'
        )
class MembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        team_id = self.kwargs.get('team_pk')
        return Membership.objects.filter(team_id=team_id, team__memberships__user=self.request.user)

    def perform_create(self, serializer):
        team_id = self.kwargs.get('team_pk')
        team = get_object_or_404(Team, id=team_id)
        # Only a team admin can add members
        if not Membership.objects.filter(team=team, user=self.request.user, role='admin').exists():
            raise PermissionDenied("Only team admins can add members.")
        serializer.save(team=team)
class MembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        team_id = self.kwargs.get('team_pk')
        return Membership.objects.filter(team_id=team_id, team__memberships__user=self.request.user)

    def perform_update(self, serializer):
        membership = self.get_object()
        # Only admins can change roles
        if not Membership.objects.filter(team=membership.team, user=self.request.user, role='admin').exists():
            raise PermissionDenied("Only team admins can change roles.")
        serializer.save()

    def perform_destroy(self, instance):
        # Prevent removing the last admin
        team = instance.team
        if instance.role == 'admin' and Membership.objects.filter(team=team, role='admin').count() <= 1:
            raise PermissionDenied("Cannot remove the last admin of the team.")
        instance.delete()