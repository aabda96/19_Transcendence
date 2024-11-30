from rest_framework import serializers
from .models import Lobby, Match, Bracket
from profiles.models import ProfileModel

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = ProfileModel
        fields = ['username', 'id', 'victories', 'loses']

class MatchSerializer(serializers.ModelSerializer):
    player1 = ProfileSerializer(read_only=True)
    player2 = ProfileSerializer(read_only=True)
    winner = ProfileSerializer(read_only=True)
    
    class Meta:
        model = Match
        fields = ['id', 'player1', 'player2', 'winner', 'is_completed']

class BracketSerializer(serializers.ModelSerializer):
    matches = MatchSerializer(many=True, read_only=True)
    
    class Meta:
        model = Bracket
        fields = ['id', 'lobby', 'matches']

class LobbySerializer(serializers.ModelSerializer):
    created_by = ProfileSerializer(read_only=True)
    players = ProfileSerializer(many=True, read_only=True)
    brackets = BracketSerializer(many=True, read_only=True)

    class Meta:
        model = Lobby
        fields = ['id', 'name', 'max_players', 'password', 'created_by', 'created_at', 'players', 'is_tournament_started', 'brackets']
        read_only_fields = ['created_by', 'created_at', 'players', 'is_tournament_started', 'brackets']
