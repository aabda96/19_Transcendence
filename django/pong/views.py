import json
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from asgiref.sync import sync_to_async, asyncio, async_to_sync
from django.core.cache import cache 
from channels.db import database_sync_to_async

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def index(request):
    return render(request, "index.html")

@csrf_exempt
def room(request, room_name):
    return render(request, "room.html", {"room_name": room_name})


# API Endpoints : 
class PongView(APIView):

    @database_sync_to_async
    def cache_get(self, key):
        return cache.get(key)

    @database_sync_to_async
    def cache_set(self, key, value):
        cache.set(key, value)

    async def update_paddle(self, room_name, direction, player_id):
        game_state = await self.cache_get(room_name)
        if not game_state:
            return None, "Game not found"

        game_state = json.loads(game_state)
        paddle = game_state['square_positions'][player_id]

        new_y = self.calculate_paddle_pos(
            direction,
            player_id,
            paddle['y'],
            game_state['canvas_height'],
            game_state['paddle_height'],
            game_state['paddle_speed']
        )
        paddle['y'] = new_y

        await self.cache_set(room_name, json.dumps(game_state))
        return new_y, None

    def put(self, request, room_name):
        try:
            direction = request.data.get('direction')
            player_id = request.data.get('player_id')
            if player_id >= 2:
                return Response({"error": "Bad Index"}, status=status.HTTP_400_BAD_REQUEST)

            new_y, error = async_to_sync(self.update_paddle)(room_name, direction, player_id)
            if error:
                return Response({"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND)

            return Response({"status": "success", "new_position": new_y})

        except Exception as e:
            print(f"Error updating paddle position: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request, room_name):

        try:
            game_state = cache.get(room_name)
            if not game_state:
                return Response({"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND)
            game_state = json.loads(game_state)

            return Response(game_state)
        except Exception as e:
            print(f"Error : Failed to get Game State : {e}")
            return Response({"error": "Failed to get Game State."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @staticmethod
    def calculate_paddle_pos(direction, player_id, current_y, canvas_height, paddle_height, paddle_speed):
        up_limit = canvas_height - paddle_height
        move_right = direction == "right"

        if player_id == 1:
            if move_right:
                new_y = min(up_limit, current_y + paddle_speed)
            else:
                new_y = max(0, current_y - paddle_speed)
        elif player_id == 0:
            if move_right:
                new_y = max(0, current_y - paddle_speed)
            else:
                new_y = min(up_limit, current_y + paddle_speed)
        return new_y

