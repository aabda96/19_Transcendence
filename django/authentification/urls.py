from django.urls import path
from .views import login_view, logout_view, user_info, register_view
from .views import ProfileView, OAuthLoginView, OAuthAuthorizeView
from .views import update_alias

urlpatterns = [
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('user-info/', user_info, name='user_info'),
    path('register/', register_view, name='register'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/oauth/login/', OAuthLoginView.as_view(), name='oauth_login'),
    path('api/oauth/authorize/', OAuthAuthorizeView.as_view(), name='oauth_authorize'),
    path('api/profiles/update_alias/', update_alias, name='update_alias'),
]
