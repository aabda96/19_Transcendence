from __future__ import annotations
from django.conf import settings
from django.db.models import Q, Model, CASCADE, ForeignKey, OneToOneField
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models

class ProfileModel(Model):
    user = OneToOneField(settings.AUTH_USER_MODEL, on_delete=CASCADE)
    avatar = models.BinaryField(blank=True, null=True)
    victories = models.PositiveIntegerField(default=0)
    loses = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=1000)
    websocket = models.PositiveIntegerField(default=0)
    online = models.BooleanField(default=False)
    alias = models.CharField(max_length=150, blank=True, null=True, default=None)
    match_history = models.JSONField(blank=True, null=True, default=list)

    def __str__(self):
        return self.user.username
		
    def get_friends(self) -> list[ProfileModel]:
        friends: list[ProfileModel] = []
        for friendship in FriendModel.objects.filter(Q(friend1=self) | Q(friend2=self)):
            friends.append(friendship.friend1 if friendship.friend1 != self else friendship.friend2)
        return friends

    def is_friend(self, friend): # Q allows to use operator such as & |
        return FriendModel.objects.filter(
            (Q(friend1=self) & Q(friend2=friend)) |
            (Q(friend2=self) & Q(friend1=friend))
        ).exists()

    def delete_friend(self, friend):
        FriendModel.objects.get(
            (Q(friend1=self) & Q(friend2=friend)) |
            (Q(friend2=self) & Q(friend1=friend))
        ).delete()

    def is_friend_requested_by(self, profile):
        return FriendRequestModel.objects.filter(author=profile, target=self).exists()

    def get_received_friend_request_from(self, profile):
        return FriendRequestModel.objects.filter(author=profile, target=self).first()

    def is_friend_requesting(self, profile):
        return FriendRequestModel.objects.filter(author=self, target=profile).exists()

    def get_outgoing_friend_request_to(self, profile):
        return FriendRequestModel.objects.filter(author=self, target=profile).first()

    def get_outgoing_friend_requests(self) -> list[ProfileModel]:
        return FriendRequestModel.objects.filter(author=self)

    def get_incoming_friend_requests(self) -> list[ProfileModel]:
        return FriendRequestModel.objects.filter(target=self)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def on_user_created(instance, created, **kwarg):
    if created:
        profile: ProfileModel = ProfileModel.objects.create(pk=instance.pk, user=instance)
        profile.save()

class FriendModel(Model):
    friend1 = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='friend1')
    friend2 = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='friend2')

class FriendRequestModel(Model):
    author = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='author')
    target = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='target')

    def accept(self):
        FriendModel(friend1=self.author, friend2=self.target).save()
        self.delete()
    def decline(self):
        self.delete()
        
from django.db.models import Model, ForeignKey, CharField, CASCADE
User = settings.AUTH_USER_MODEL


class NoticeModel(Model):
    user = OneToOneField(settings.AUTH_USER_MODEL, on_delete=CASCADE)
    data = CharField(max_length=10240)
    
class BlockModel(Model):
    blocker = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='blocker')
    blocked = ForeignKey(ProfileModel, on_delete=CASCADE, related_name='blocked')