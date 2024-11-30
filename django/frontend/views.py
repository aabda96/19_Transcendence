from django.shortcuts import render
import json
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache 
import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.cache import cache
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

def index_view(request):
    return render(request, 'index.html')

def index_view_ssr(request):
    return render(request, 'views/index.html')

def profile_view_ssr(request):
    return render(request, 'views/profile.html')

def social_view_ssr(request):
    return render(request, 'views/social.html')

def pong_view_ssr(request):
    return render(request, 'views/pong.html')

def chat_view_ssr(request):
    return render(request, 'views/chat.html')

def tournament_view_ssr(request):
    return render(request, 'views/tournament.html')
class PongView(APIView):

    def put(self, request, room_name):

        direction = request.data.get('direction')
        player_id = request.data.get('player_id')
        if player_id >= 2:
            return Response({"error": "Bad Index"}, status=status.HTTP_400_BAD_REQUEST)

        game_state = cache.get(room_name)
        if not game_state:
            return Response({"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND)

        game_state = json.loads(game_state)

        paddle = game_state['square_positions'][player_id]
        canvas_height = game_state['canvas_height']
        paddle_height = game_state['paddle_height']
        paddle_speed = game_state['paddle_speed']

        current_y = paddle['y']
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
        paddle['y'] = new_y

        cache.set(room_name, json.dumps(game_state))
        return Response({"status": "success", "new_position": new_y})

    def get(self, request, room_name):

        game_state = cache.get(room_name)
        if not game_state:
            return Response({"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND)
        game_state = json.loads(game_state)

        return Response(game_state)

    def post(self, request, room_name):
        return Response()
    def delete(self, request, room_name):
        """Handle game termination requests"""
        try:
            # Get game state from cache
            game_state = cache.get(room_name)
            if not game_state:
                # return Response({"error": "Game not found"}, status=status.HTTP_404_NOT_FOUND)
                return render(request, 'index.html')
            
            game_state = json.loads(game_state)
            
            # Get channel layer
            channel_layer = get_channel_layer()
            
            # Send stop_game message to room group
            async_to_sync(channel_layer.group_send)(
                room_name,
                {
                    'type': 'game.message',
                    'message': {
                        'type': 'stop_game',
                        'reason': request.data.get('reason', 'player_left')
                    }
                }
            )
            
            # Clean up game state
            cache.delete(room_name)
            
            return Response({"status": "success"}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return render(request, 'index.html')
            # return Response(
            #     {"error": f"Failed to terminate game: {str(e)}"}, 
            #     status=status.HTTP_500_INTERNAL_SERVER_ERROR
            # )
