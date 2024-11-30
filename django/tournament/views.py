import random
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.generics import DestroyAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Lobby, Match
from profiles.models import ProfileModel
from .serializers import LobbySerializer, MatchSerializer

class LobbyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        profile = ProfileModel.objects.get(user=request.user)
        if Lobby.objects.filter(created_by=profile).exists():
            return Response(
                {'detail': 'You already have an active lobby. You cannot create another one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        lobby = Lobby.objects.create(
            name=data['name'],
            max_players=data['max_players'],
            password=data.get('password'),
            created_by=profile
        )
        lobby.players.add(profile)
        return Response(LobbySerializer(lobby).data, status=status.HTTP_201_CREATED)


class LobbyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lobbies = Lobby.objects.all()
        serializer = LobbySerializer(lobbies, many=True)
        return Response(serializer.data)


class LobbyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        lobby = get_object_or_404(Lobby, id=id)
        serializer = LobbySerializer(lobby)
        return Response(serializer.data)


class JoinLobbyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        profile = ProfileModel.objects.get(user=request.user)
        if Lobby.objects.filter(players=profile).exists():
            return Response(
                {'detail': 'You are already in a lobby. You cannot join another one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        lobby = get_object_or_404(Lobby, id=id)
        if lobby.players.count() >= lobby.max_players:
            return Response({'detail': 'Lobby is full.'}, status=status.HTTP_400_BAD_REQUEST)
        lobby.players.add(profile)
        return Response({'detail': 'Joined lobby.'}, status=status.HTTP_200_OK)

class StartTournamentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        lobby = get_object_or_404(Lobby, id=id)
        if lobby.is_tournament_started:
            return Response({'detail': 'Tournament already started.'}, status=status.HTTP_400_BAD_REQUEST)
        lobby.is_tournament_started = True
        lobby.save()
        players = list(lobby.players.all())
        random.shuffle(players)
        matches = []
        for i in range(0, len(players), 2):
            player1 = players[i]
            player2 = players[i + 1] if i + 1 < len(players) else None
            match = Match.objects.create(lobby=lobby, player1=player1, player2=player2)
            matches.append(match)
            if player2:
                winner = random.choice([player1, player2])
                match.winner = winner
                match.is_completed = True
                match.save()
            else:
                match.winner = player1
                match.is_completed = True
                match.save()
        lobby.delete()
        return Response({'matches': MatchSerializer(matches, many=True).data}, status=status.HTTP_200_OK)


class CompleteMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, match_id):
        lobby = get_object_or_404(Lobby, id=id)
        match = get_object_or_404(Match, id=match_id, lobby=lobby)
        if match.is_completed:
            return Response({'detail': 'Match is already completed.'}, status=status.HTTP_400_BAD_REQUEST)
        match.winner = random.choice([match.player1, match.player2])
        match.is_completed = True
        match.save()
        return Response({'match': MatchSerializer(match).data}, status=status.HTTP_200_OK)


class DeleteLobbyView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Lobby.objects.all()
    
    def delete(self, request, id):
        lobby = get_object_or_404(Lobby, id=id)
        profile = ProfileModel.objects.get(user=request.user)
        if lobby.created_by != profile:
            return Response({'detail': 'You do not have permission to delete this lobby.'}, status=status.HTTP_403_FORBIDDEN)
        lobby.delete()
        return Response({'detail': 'Lobby deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
