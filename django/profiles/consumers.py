from __future__ import annotations
import json
from django.conf import settings
from channels.generic.websocket import WebsocketConsumer
from profiles.serializers import ProfileSerializer
from profiles.models import ProfileModel
from .models import NoticeModel

User = settings.AUTH_USER_MODEL

class NoticeManager:
    def __init__(self):
        self._list: list[NoticeConsumer] = []

    def add(self, consumer: NoticeConsumer):
        self._list.append(consumer)
        unsend_notices = NoticeModel.objects.filter(user=consumer.user)
        for notice in unsend_notices:
            consumer.send(notice.data)
            notice.delete()

        for friend in consumer.user.profilemodel.get_friends():
            self.notify_user(friend.user, {'type': 'online',
                                           'user': ProfileSerializer(consumer.user.profilemodel).data})

    def remove(self, consumer: NoticeConsumer):
        if consumer.user.is_authenticated:
            for friend in consumer.user.profilemodel.get_friends():
                self.notify_user(friend.user, {'type': 'offline',
                                               'user': ProfileSerializer(consumer.user.profilemodel).data})
        self._list.remove(consumer)

    def get_consumer_by_user(self, user: User):
        for consumer in self._list:
            if consumer.user == user:
                return consumer

    def notify_user(self, user: User, data: dict):
        consumer = self.get_consumer_by_user(user)
        data_str: str = json.dumps(data)
        if consumer:
            consumer.send(data_str)
        else:
            NoticeModel(user=user, data=data_str).save()

    def notify_friend_request(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'friend_request', 'author': ProfileSerializer(friend).data})
    def send_message(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'chat', 'author': ProfileSerializer(friend).data})
    def chat_declined(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'chat_declined', 'author': ProfileSerializer(friend).data})
    def chat_accepted(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'chat_accepted', 'author': ProfileSerializer(friend).data})
    def send_message_game(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'game', 'author': ProfileSerializer(friend).data})
    def game_declined(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'game_declined', 'author': ProfileSerializer(friend).data})
    def game_accepted(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'game_accepted', 'author': ProfileSerializer(friend).data})
    def send_message_game_tournament(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'tournament', 'author': ProfileSerializer(friend).data})
    def game_tournament_declined(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'game_tournament_declined', 'author': ProfileSerializer(friend).data})
    def game_tournament_accepted(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'game_tournament_accepted', 'author': ProfileSerializer(friend).data})
    def notify_friend_request_canceled(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'friend_request_canceled', 'author': ProfileSerializer(friend).data})
    def notify_new_friend(self, user: User, friend: ProfileModel):
        serialized_data = ProfileSerializer(friend).data
        self.notify_user(user, {'type': 'new_friend', 'friend': serialized_data})
        # if self.get_consumer_by_user(user) is not None:
        #     status = 'online'
        # else:
        #     status = 'offline'
        # self.notify_user(user, {'type': 'online', 'user': serialized_data})
        # self.notify_user(friend.user, {'type': status, 'user': ProfileSerializer(user.profilemodel).data})

    def notify_friend_removed(self, user: User, friend: ProfileModel):
        self.notify_user(user, {'type': 'friend_removed', 'friend': ProfileSerializer(friend).data})


notice_manager = NoticeManager()


class NoticeConsumer(WebsocketConsumer):
    def connect(self):
        self.user: User = self.scope['user']
        if not self.user.is_authenticated:
            self.close()
            return
        print(self.user, 'connected')
        profile = ProfileModel.objects.get(user=self.user)
        profile.online = True
        profile.save()
        self.accept()
        notice_manager.add(self)

    def disconnect(self, code):
        
        profile = ProfileModel.objects.get(user=self.user)
        profile.online = False
        profile.save()
        if self.scope['user'].is_authenticated:
            notice_manager.remove(self)
        super().disconnect(code)
