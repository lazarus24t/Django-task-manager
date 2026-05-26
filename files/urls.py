from django.urls import path
from .views import FileListCreateView, FileDetailView

urlpatterns = [
    path('teams/<int:team_pk>/files/', FileListCreateView.as_view(), name='file-list-create'),
    path('teams/<int:team_pk>/files/<int:pk>/', FileDetailView.as_view(), name='file-detail'),
]