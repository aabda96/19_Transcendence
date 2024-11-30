from django.urls import path
from .views import LobbyView, LobbyListView, LobbyDetailView, JoinLobbyView, StartTournamentView, CompleteMatchView, DeleteLobbyView

urlpatterns = [
    path('lobby/', LobbyListView.as_view(), name='lobby-list'),
    path('lobby/create/', LobbyView.as_view(), name='lobby-create'),
    path('lobby/<int:id>/', LobbyDetailView.as_view(), name='lobby-detail'),
    path('lobby/<int:id>/join/', JoinLobbyView.as_view(), name='lobby-join'),
    path('lobby/<int:id>/start/', StartTournamentView.as_view(), name='start-tournament'),
    path('lobby/<int:id>/delete/', DeleteLobbyView.as_view(), name='delete-lobby'),
    path('match/<int:match_id>/complete/', CompleteMatchView.as_view(), name='complete-match'),
]
