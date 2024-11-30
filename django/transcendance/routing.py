from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path, re_path
from chat.consumers import ChatConsumer
from pong.consumers import PongConsumer
from profiles.consumers import NoticeConsumer
from pong.consumers import TournamentConsumer

websocket_urlpatterns = [
    re_path(r"game/(?P<room_name>[\w-]+)/$", PongConsumer.as_asgi()),
    re_path(r"chat/(?P<room_name>\w+)/$", ChatConsumer.as_asgi()),
	re_path(r'ws/notice$', NoticeConsumer.as_asgi()),
    re_path(r"tournament/(?P<room_name>[\w-]+)/$", TournamentConsumer.as_asgi()),
]

