from django.shortcuts import render
from django.contrib import admin
from django.urls import path, include, re_path
from authentification.views import OAuthLoginView, OAuthAuthorizeView
from pong.views import PongView
from rest_framework.urlpatterns import format_suffix_patterns


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('authentification.urls')),
    path('api/auth/', include('authentification.urls')),
    path('api/oauth/login/', OAuthLoginView.as_view(), name='oauth_login'),
    path('api/oauth/authorize/', OAuthAuthorizeView.as_view(), name='oauth_authorize'),
    path('', include('frontend.urls')),
    path('api/profiles/', include('profiles.urls')),
    path('api/tournament/', include('tournament.urls')), 
    path('api/game/<str:room_name>/update/', PongView.as_view(), name='game-update'),
    path('api/game/<str:room_name>/get_pong/', PongView.as_view(), name='get-game'),
    re_path(r'^(?!api/oauth/).*$', lambda request: render(request, 'index.html')),
]
