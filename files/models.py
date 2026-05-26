from django.db import models
from api.models import Team, User  # reuse models from api app

def team_file_path(instance, filename):
    # Files will be saved to: media/team_<id>/<filename>
    return f'team_{instance.team.id}/{filename}'

class File(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='files')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to=team_file_path)
    name = models.CharField(max_length=255, blank=True)       # optional display name
    description = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name