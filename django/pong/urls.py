from django.urls import path

urlpatterns = [
    path("", views.index, name="index"),
    path("/", views.room, name="room"),
]