from django.urls import path
from .views import index_view, profile_view_ssr, index_view_ssr, social_view_ssr, pong_view_ssr, chat_view_ssr, tournament_view_ssr
from . import views

urlpatterns = [
    path('', index_view, name='index'),
	path('views/index', index_view_ssr, name='index_view_ssr'),
	path('views/profile', profile_view_ssr, name='profile_view_ssr'),
	path('views/social', social_view_ssr, name='social_view_ssr'),
	path('views/pong', pong_view_ssr, name='pong_view_ssr'),
	path('views/chat', chat_view_ssr, name='chat_view_ssr'),
	path('views/tournament', tournament_view_ssr, name='tournament_view_ssr'),
	path('api/game/<str:room_name>/terminate/', views.PongView.as_view(), name='terminate_game'),
]
