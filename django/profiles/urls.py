from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AllProfile, UserProfile, GetFriendsView, EditFriendView, GetIncomingFriendRequestView, tournament, tournament_declined, tournament_accepted
from .views import GetOutgoingFriendRequestView, UploadAvatarView, GetAvatarView, deletefriendrequest, chat, chat_declined, chat_accepted, GetBlocksView, EditBlocksView, GetBlocksView, GetwhoBlocksMeView, game, game_declined, game_accepted

router = DefaultRouter()
router.register(r'', AllProfile, basename='profile')
router.register(r'', UserProfile, basename='my_profile')

urlpatterns = [
    path("me", UserProfile.as_view({'get': 'retrieve'}), name="my_profile_page"),
    path("friends", GetFriendsView.as_view(), name="friends_list_page"),
	path("delete_request/<int:pk>", deletefriendrequest.as_view(), name="delete_friend_request"),
    path("friends/<int:pk>", EditFriendView.as_view(), name="friends_edit_page"),
	path('chat/<int:pk>', chat.as_view(), name='chat'),
	path('game/<int:pk>', game.as_view(), name='game'),
	path('game_declined/<int:pk>', game_declined.as_view(), name='game_declined'),
	path('game_accepted/<int:pk>', game_accepted.as_view(), name='game_accept'),
	path("tournament/<int:pk>", tournament.as_view(), name="tournament"),
	path("tournament_declined/<int:pk>", tournament_declined.as_view(), name="tournament_declined"),
	path("tournament_accepted/<int:pk>", tournament_accepted.as_view(), name="tournament_accept"),
	path('chat_declined/<int:pk>', chat_declined.as_view(), name='chat_declined'),
	path('chat_accepted/<int:pk>', chat_accepted.as_view(), name='chat_accept'),
    path("incoming_friend_requests", GetIncomingFriendRequestView.as_view(), name="incoming_friend_requests"),
    path("outgoing_friend_requests", GetOutgoingFriendRequestView.as_view(), name="outgoing_friend_requests"),
    path("user/<str:username>", AllProfile.as_view({'get': 'retrieve'}), name="profile_page"),
    path("id/<int:pk>", AllProfile.as_view({'get': 'retrieve_id'}), name="profile_page"),
    path('upload_avatar/', UploadAvatarView.as_view(), name='upload_avatar'),
    path('get_avatar/', GetAvatarView.as_view(), name='get_avatar'),
	path("block", GetBlocksView.as_view(), name="block_page"),
    path("block/<int:pk>", EditBlocksView.as_view(), name="block_page"),
	path("blockme", GetwhoBlocksMeView.as_view(), name="block_page"),
	path('', include(router.urls)),
]
