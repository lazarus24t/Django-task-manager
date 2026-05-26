from rest_framework import permissions

class IsTeamMember(permissions.BasePermission):
    """
    Allow access only if the user is a member of the task's team.
    """
    def has_object_permission(self, request, view, obj):
        # obj is a Task instance
        return obj.team.memberships.filter(user=request.user).exists()