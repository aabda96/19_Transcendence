from django.db import models
from profiles.models import ProfileModel

class Lobby(models.Model):
    name = models.CharField(max_length=100)
    max_players = models.PositiveIntegerField(default=4)
    password = models.CharField(max_length=50, null=True, blank=True)
    players = models.ManyToManyField(ProfileModel, related_name='lobbies', blank=True)
    created_by = models.ForeignKey(ProfileModel, on_delete=models.CASCADE, related_name='created_lobbies')
    created_at = models.DateTimeField(auto_now_add=True)
    is_tournament_started = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class Match(models.Model):
    lobby = models.ForeignKey(Lobby, on_delete=models.CASCADE, related_name='matches')
    player1 = models.ForeignKey(ProfileModel, on_delete=models.CASCADE, related_name='match_player1', null=True, blank=True)
    player2 = models.ForeignKey(ProfileModel, on_delete=models.CASCADE, related_name='match_player2', null=True, blank=True)
    winner = models.ForeignKey(ProfileModel, on_delete=models.SET_NULL, related_name='won_matches', null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.player1} vs {self.player2}"

class Bracket(models.Model):
    lobby = models.ForeignKey(Lobby, on_delete=models.CASCADE, related_name='brackets')
    matches = models.ManyToManyField(Match, related_name='brackets')

    def __str__(self):
        return f"Bracket for {self.lobby.name}"
