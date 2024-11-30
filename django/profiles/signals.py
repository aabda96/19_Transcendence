from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import ProfileModel

@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    profile = ProfileModel.objects.get(user=user)
    profile.online = True
    profile.save()

@receiver(user_logged_out)
def user_logged_out_handler(sender, request, user, **kwargs):
    profile = ProfileModel.objects.get(user=user)
    profile.online = False
    profile.save()