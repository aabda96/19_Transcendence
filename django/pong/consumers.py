import json
import copy
import time
import math
import re
from datetime import datetime
from channels.generic.websocket import WebsocketConsumer, AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from profiles.models import ProfileModel
from asgiref.sync import async_to_sync, sync_to_async, asyncio
from channels.db import database_sync_to_async
from .tournament_manager import TournamentManager
from django.core.cache import cache

class PongConsumer(AsyncWebsocketConsumer):
    canvas_width = 800
    canvas_height = 400
    paddleWidth = 5
    paddleHeight = 100
    paddleSpeed = 23
    ball_radius = 6
    ballSpeed = -5
    initial_pos = { "x": canvas_width / 2, "y": canvas_height / 2, "dx": 4, "dy": 4 }


    rooms = {}
    players = {}
    tournament_name = ""

#       CONNECT --------------------------------------------------------------------------------------------------------

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.user = self.scope['user']

        self.tournament_name = self.extract_tournament_name(self.room_name)
        self.tournament_room_name = f"tournament_{self.tournament_name}" if self.tournament_name else None

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )

        self.game_over = False

        if not self.user.is_authenticated:
            await self.close()
            return

        if self.room_name not in PongConsumer.rooms:
            PongConsumer.rooms[self.room_name] = []

        if len(PongConsumer.rooms[self.room_name]) < 2:

            user_profile = await sync_to_async(ProfileModel.objects.get)(user=self.user)

            PongConsumer.rooms[self.room_name].append({
                'client': self,
                'user': user_profile,
                'score': 0
            })
            self.index = len(PongConsumer.rooms[self.room_name]) - 1
            self.username = await sync_to_async(lambda: user_profile.user.username)()
            self.players[self.username] = self.index
            self.players[self.username] = {
                'username' : self.username,
                'index' : self.index,
            }
            await self.accept()

            if len(PongConsumer.rooms[self.room_name]) == 2 and self.index == 1:
                await self.initialize_game()
                await self.send_start_game_message()
                asyncio.create_task(self.game_loop())
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.room_name in PongConsumer.rooms:
            PongConsumer.rooms[self.room_name] = [
                client for client in PongConsumer.rooms[self.room_name]
                if client['client'] != self
            ]
            if len(PongConsumer.rooms[self.room_name]) == 0:
                del PongConsumer.rooms[self.room_name]
            await cache.adelete(self.room_name)
        self.game_over = True

    def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'terminate_game':
            self.handle_game_termination(data)

    def handle_game_termination(self, data):
        if self.room_name in self.rooms:

            for client in self.rooms[self.room_name]:
                client['client'].send(text_data=json.dumps({
                    'type': 'stop_game',
                    'reason': data.get('reason', 'game_terminated')
                }))
            
            self.game_over = True
            cache.delete(self.room_name)
            

            if self.room_name in self.rooms:
                del self.rooms[self.room_name]

    async def receive(self, text_data):
        pass

    def extract_tournament_name(self, room_name):
        try:
            elements = room_name.split('_')
            if len(elements) == 3:
                return elements[0]
            return None
        except Exception as e:
            print(f"Exception in extract_tournament_name : {e}")

    def get_player_username(self, index):
        return PongConsumer.rooms[self.room_name][index]['user'].user.username
    
    async def get_player_alias(self, username):
        try:
            profile = await database_sync_to_async(ProfileModel.objects.get)(user__username=username)
            return profile.alias if profile.alias else username
        except ProfileModel.DoesNotExist:
            return username
        
    async def initialize_game(self):
        left_player = await database_sync_to_async(self.get_player_username)(0)
        right_player = await database_sync_to_async(self.get_player_username)(1)
        left_alias = await self.get_player_alias(left_player)
        right_alias = await self.get_player_alias(right_player)
        self.players[left_player]['alias'] = left_alias
        self.players[right_player]['alias'] = right_alias
        self.players[left_player]['camera'] = "camera1"
        self.players[right_player]['camera'] = "camera2"

        PongConsumer.initial_game_state = {
            'square_positions' : [
                { "x": 0, "y": self.canvas_height / 2 - self.paddleHeight / 2, "dy": 0 },
                { "x": self.canvas_width - self.paddleWidth, "y": self.canvas_height / 2 - self.paddleHeight / 2, "dy": 0 }
            ],
            'initial_pos' : { "x": PongConsumer.canvas_width / 2, "y": PongConsumer.canvas_height / 2, "dx": 4, "dy": 4 },
            'ball_position' : copy.deepcopy(PongConsumer.initial_pos),
            'ball_velocity' : {"x": PongConsumer.ballSpeed, "y": PongConsumer.ballSpeed},
            'left_player' : left_player,
            'right_player' : right_player,
            "canvas_width": PongConsumer.canvas_width,
            "canvas_height": PongConsumer.canvas_height,
            "paddle_height": PongConsumer.paddleHeight,
            "paddle_width": PongConsumer.paddleWidth,
            'paddle_speed' : self.paddleSpeed,
            "ball_radius": PongConsumer.ball_radius,
            'players' : self.players,
            'scores' : {
                'player1' : 0,
                'player2' : 0
            },
            'left_alias' : left_alias,
            'right_alias' : right_alias,
        }

        await cache.aset(self.room_name, json.dumps(PongConsumer.initial_game_state))
        

#       MOVE PADDLE --------------------------------------------------------------------------------------------------------

    # def handle_move_paddle(self, direction):
    #     if self.game_over:
    #         return

    #     square_index = self.index
    #     current_position = PongConsumer.square_positions[square_index]
    #     current_y = current_position["y"]
    #     up_limit = self.canvas_height - self.paddleHeight

    #     move_up = direction == "right" if square_index == 0 else direction == "left"

    #     if move_up:
    #         new_y = max(0, current_y - self.paddleSpeed)
    #     else:
    #         new_y = min(up_limit, current_y + self.paddleSpeed)

    #     current_position["y"] = new_y
    #     self.send_move_paddle_message()

#       MOVE BALL --------------------------------------------------------------------------------------------------------

    async def detect_wall_collision(self, game_state):
        ball_position = game_state['ball_position']
        ball_velocity = game_state['ball_velocity']
        ball_radius = game_state['ball_radius']
        canvas_height = game_state['canvas_height']
        
        if ball_position["y"] - ball_radius <= 0:
            ball_position["y"] = ball_radius
            ball_velocity["y"] = abs(ball_velocity["y"])
        elif ball_position["y"] + ball_radius >= canvas_height:
            ball_position["y"] = canvas_height - ball_radius
            ball_velocity["y"] = -abs(ball_velocity["y"])
        
        return game_state

    async def detect_paddle_collision(self, game_state, index, paddle):
        ball_position = game_state['ball_position']
        ball_velocity = game_state['ball_velocity']
        ball_radius = game_state['ball_radius']
        paddle_width = game_state['paddle_width']
        paddle_height = game_state['paddle_height']
        
        ball_center_x = ball_position["x"]
        ball_center_y = ball_position["y"]
        
        paddle_left = paddle["x"]
        paddle_right = paddle["x"] + paddle_width
        paddle_top = paddle["y"]
        paddle_bottom = paddle["y"] + paddle_height

        next_x = ball_center_x + ball_velocity["x"]
        next_y = ball_center_y + ball_velocity["y"]

        will_intersect_x = (index == 0 and 
                        ball_center_x > paddle_left and 
                        next_x <= paddle_left + ball_radius) or \
                        (index == 1 and 
                        ball_center_x < paddle_right and 
                        next_x >= paddle_right - ball_radius)

        is_within_paddle_height = (ball_center_y + ball_radius >= paddle_top and 
                                ball_center_y - ball_radius <= paddle_bottom)

        if will_intersect_x and is_within_paddle_height:
            paddle_center_y = paddle_top + paddle_height / 2
            impact_y = (ball_center_y - paddle_center_y) / (paddle_height / 2)
            impact_y = max(-1, min(1, impact_y))

            max_bounce_angle = math.radians(75)
            bounce_angle = impact_y * max_bounce_angle

            current_speed = math.sqrt(ball_velocity["x"]**2 + ball_velocity["y"]**2)
            speed_increase = 1.05
            new_speed = current_speed * speed_increase

            if index == 0:  # Left paddle
                ball_position["x"] = paddle_left + ball_radius
                ball_velocity["x"] = abs(new_speed * math.cos(bounce_angle))
            else:           # Right paddle
                ball_position["x"] = paddle_right - ball_radius
                ball_velocity["x"] = -abs(new_speed * math.cos(bounce_angle))
                
            ball_velocity["y"] = new_speed * math.sin(bounce_angle)

            max_speed = 15
            if abs(ball_velocity["x"]) > max_speed:
                ratio = max_speed / abs(ball_velocity["x"])
                ball_velocity["x"] *= ratio
                ball_velocity["y"] *= ratio
        
        return game_state


    async def game_loop(self):
        await asyncio.sleep(4.2)
        while not self.game_over:
            try:
                # update game infos from cache -----------------------
                game_state = await cache.aget(self.room_name)
                if not game_state:
                    continue

                game_state = json.loads(game_state)
                square_positions = game_state['square_positions']
                ball_position = game_state['ball_position']
                ball_velocity = game_state['ball_velocity']
                canvas_width = game_state['canvas_width']

                next_x = ball_position["x"] + ball_velocity["x"]
                next_y = ball_position["y"] + ball_velocity["y"]

                if next_x < 0 or next_x > canvas_width:
                    await self.handle_scoring(next_x)
                    pass
                else:
                    ball_position["x"] = next_x
                    ball_position["y"] = next_y

                    game_state = await self.detect_wall_collision(game_state)
                    for index, paddle in enumerate(square_positions):
                        game_state = await self.detect_paddle_collision(game_state, index, paddle)

                    await cache.aset(self.room_name, json.dumps(game_state))
                    await self.send_move_ball_message()

                await asyncio.sleep(1/60)


            except Exception as e:
                print(f"Error in game_loop : {e}")
                await asyncio.sleep(0.1)

#       SCORING ------------------------------------------------------------------------------------------------------------



    async def handle_scoring(self, next_x):
        try:
            game_state = await cache.aget(self.room_name)
            if not game_state:
                return
            
            game_state = json.loads(game_state)
            room = PongConsumer.rooms[self.room_name]
            winner = None

            if next_x <= 0:
                player = room[1]
                player['score'] += 1
                game_state['scores']['player2'] += 1

            else:
                player = room[0]
                player['score'] += 1
                game_state['scores']['player1'] += 1

            game_state['ball_position'] = copy.deepcopy(game_state['initial_pos'])
            game_state['ball_velocity'] = copy.deepcopy(game_state['ball_velocity'])

            await cache.aset(self.room_name, json.dumps(game_state))
            await self.send_score_message(player)

            for player in room:
                if player['score'] >= 3:
                    winner = player
                    break

            if winner:
                self.game_over = True
                await self.update_score_in_db(winner['user'])
                await self.send_win_message(winner)
                
                del PongConsumer.rooms[self.room_name]
                await cache.adelete(self.room_name)

        except Exception as e:
            print(f"Error in handle_scoring: {e}")
            await asyncio.sleep(0.1)

    @database_sync_to_async
    def update_score_in_db(self, winner):
        
        try:
            loser = None
            current_date = datetime.now().strftime('%Y-%m-%d')

            for player in PongConsumer.rooms[self.room_name]:
                if player['user'] != winner:
                    loser = player['user']
                    break

            winner.points += 15
            winner.victories += 1
            winner.save()
            
            loser.points -= 15
            if loser.points <= 0:
                loser.points = 0
            loser.loses += 1
            loser.save()

            winner_entry = {
                "result": "win",
                "opponent": loser.user.username,
                "date": current_date
            }

            loser_entry = {
                "result": "lose",
                "opponent": winner.user.username,
                "date": current_date
            }

            if winner.match_history is None:
                winner.match_history = []
            winner.match_history.append(winner_entry)
            
            if loser.match_history is None:
                loser.match_history = []
            loser.match_history.append(loser_entry)

            winner.save()
            loser.save()

        except Exception as e:
            print(f"Error updating the database : {e}")



#       MESSAGE SENDERS ------------------------------------------------------------------------------------------------------------

    async def send_score_message(self, player):
        scores = {
            "player1": PongConsumer.rooms[self.room_name][0]['score'],
            "player2": PongConsumer.rooms[self.room_name][1]['score']
            }
        score_message = {
            "type": "score",
            "player": player['user'].user.username,
            "scores": json.dumps(scores),
        }

        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "score_message",
                "message": score_message
            }
        )

    async def send_move_ball_message(self):

        game_state = await cache.aget(self.room_name)
        game_state = json.loads(game_state)

        ball_message = {
                "type": "move_ball",
                "ball_position": game_state['ball_position'],
                "paddle_positions": game_state['square_positions'],
            }

        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "move_ball",
                "message": ball_message
            }
        )


    async def send_win_message(self, winner):

        # if self.tournament_room_name:
        #     winner = await sync_to_async(lambda: winner['user'].alias)()
        # else:
        winner = await sync_to_async(lambda: winner['user'].user.username)()
        tournament_name = None
        if self.tournament_room_name:
            tournament_name = self.tournament_name
        win_message = {
                "type": "win_game",
                'tournament_name': tournament_name,
                "winner": winner,
            }

        if tournament_name:
            await self.channel_layer.group_send(
                f'tournament_{tournament_name}',
                {
                    'type': 'handle_game_complete',
                    'tournament_name': tournament_name,
                    'winner': winner,
                }
            )
        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "win_game",
                "message": win_message
            }
        )

        await self.disconnect("none")

    async def send_start_game_message(self):

        start_message = {
            "type": "start_game"
        }

        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "game_message",
                "message": start_message
            }
        )


#     MESSAGE WRAPPERS ------------------------------------------------------------------------------------------------------------

    async def game_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def move_ball(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def score_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def win_game(self, event):
        await self.send(text_data=json.dumps(event["message"]))







from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .tournament_manager import TournamentManager
import json

class TournamentConsumer(AsyncWebsocketConsumer):
    tournament_manager = TournamentManager()
    active_games = {}

    @database_sync_to_async
    def set_tournament_config(self, max_players, tournament_name):
        return self.tournament_manager.set_config(max_players, tournament_name)

    @database_sync_to_async
    def add_tournament_player(self, tournament_name, player_name, channel_name):
        return self.tournament_manager.add_player(tournament_name, player_name, channel_name)

    @database_sync_to_async
    def get_tournament_players(self, tournament_name):
        return self.tournament_manager.get_players(tournament_name)

    @database_sync_to_async
    def is_tournament_full(self, tournament_name):
        return self.tournament_manager.is_full(tournament_name)

    @database_sync_to_async
    def add_winner(self, tournament_name, winner):
        return self.tournament_manager.add_winner(tournament_name, winner)

    @database_sync_to_async
    def is_round_complete(self, tournament_name):
        return self.tournament_manager.is_round_complete(tournament_name)

    @database_sync_to_async
    def get_round_winners(self, tournament_name):
        return self.tournament_manager.get_round_winners(tournament_name)

    @database_sync_to_async
    def reset_round(self, tournament_name):
        return self.tournament_manager.reset_round(tournament_name)

    @database_sync_to_async
    def delete_tournament(self, tournament_name):
        return self.tournament_manager.delete_tournament(tournament_name)

    @database_sync_to_async
    def get_channel_name(self, tournament_name, player_name):
        return self.tournament_manager.get_channel_name(tournament_name, player_name)

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'tournament_{self.room_name}'
        self.user = self.scope['user'].username

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        handlers = {
            'create_lobby': self.create_lobby,
            'join_lobby': self.join_lobby,
            'start_tournament': self.start_tournament,
            'start_next_game': self.start_next_game,
            'leave_tournament': self.handle_leave_tournament,
            'cancel_tournament': self.handle_cancel_tournament,
            'start_game_tournament': self.start_game_tournament,
            'handle_game_complete': self.handle_game_complete
        }
        
        handler = handlers.get(data['type'])
        if handler:
            await handler(data)

    async def create_lobby(self, data):
        success = await self.set_tournament_config(
            data['max_players'],
            data['tournament_name']
        )
        
        if success:
            await self.send(text_data=json.dumps({
                'type': 'lobby_created',
                'message': f'Lobby "{data["tournament_name"]}" created with {data["max_players"]} max players.'
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Lobby "{data["tournament_name"]}" already exists.'
            }))

    async def join_lobby(self, data):
        success = await self.add_tournament_player(
            data['tournament_name'],
            data['player_name'],
            self.channel_name
        )
        
        if success:
            players = await self.get_tournament_players(data['tournament_name'])
            is_full = await self.is_tournament_full(data['tournament_name'])
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_lobby',
                    'players': [p[0] for p in players],
                    'tournament_full': is_full
                }
            )

    async def start_tournament(self, data):
        tournament_name = data['tournament_name']
        players = await self.get_tournament_players(tournament_name)

        self.active_games[tournament_name] = {
            'current_game': 0,
            'total_games': len(players) // 2,
            'pairs': [(players[i], players[i + 1]) for i in range(0, len(players), 2)]
        }

        await self.start_next_game(tournament_name)

    async def start_next_game(self, tournament_name):

        try:
            game_info = self.active_games.get(tournament_name)
            if not game_info or game_info['current_game'] >= game_info['total_games']:
                return

            current_pair = game_info['pairs'][game_info['current_game']]
            player1, player2 = current_pair
            game_room = f'{tournament_name}_{player1[0]}_{player2[0]}'

            for player in [player1, player2]:
                await self.channel_layer.send(
                    player[1],
                    {
                        'type': 'start_game_tournament',
                        'room_name': game_room,
                        'tournament_name': tournament_name,
                        'players': [player1[0], player2[0]]   
                    }
                )
        except Exception as e:
            print(f"Probleme in start next game: {e}")

    async def handle_leave_tournament(self, data):
        tournament_name = data['tournament_name']
        player_name = data['player_name']
        is_organizer = data.get('is_organizer', False)

        if is_organizer:
            await self.handle_cancel_tournament(data)
        else:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_left',
                    'player_name': player_name,
                    'is_organizer': is_organizer
                }
            )

    async def handle_cancel_tournament(self, data):
        tournament_name = data['tournament_name']
        await self.delete_tournament(tournament_name)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'tournament_cancelled',
                'tournament_name': tournament_name
            }
        )

    async def handle_game_complete(self, event):
        tournament_name = event['tournament_name']
        game_info = self.active_games.get(tournament_name)
        winner = event['winner']

        players = await self.get_tournament_players(tournament_name)
        for player in players:
            if player[0] == winner:
                winner = player


        round_winners = await self.get_round_winners(tournament_name)
        await self.add_winner(tournament_name, winner)
        if winner[0] == self.user:

            current_players = self.tournament_manager.get_players(tournament_name)
            expected_winners = len(current_players) // 2

            if game_info:
                game_info['current_game'] += 1
                if game_info['current_game'] < game_info['total_games']:
                    await self.start_next_game(tournament_name)
                else:
                    if len(round_winners) == expected_winners:
                        if len(round_winners) == 1:
                            await self.channel_layer.group_send(
                                self.room_group_name,
                                {
                                    'type': 'win_tournament',
                                    'winner': round_winners[0],
                                    'tournament_name': tournament_name
                                }
                            )
                        else:
                            await self.start_next_round(tournament_name)
                    else:
                        await self.start_next_game(tournament_name)
        elif not players and len(round_winners) == 1 and winner == self.user:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'win_tournament',
                    'winner': round_winners[0],
                    'tournament_name': tournament_name
                }
            )
            self.tournament_manager.delete_tournament(tournament_name)


    async def start_next_round(self, tournament_name):

        players = await self.get_tournament_players(tournament_name) 
        round_winners = await self.get_round_winners(tournament_name)
        
        self.active_games[tournament_name] = {
            'current_game': 0,
            'total_games': len(round_winners) // 2,
            'pairs': [(round_winners[i], round_winners[i + 1]) 
                    for i in range(0, len(round_winners), 2)]
        }
        self.tournament_manager.reset_round(tournament_name)
        await self.start_next_game(tournament_name)


    # Message handlers
    async def update_lobby(self, event):
        await self.send(text_data=json.dumps(event))

    async def player_left(self, event):
        await self.send(text_data=json.dumps(event))

    async def tournament_cancelled(self, event):
        await self.send(text_data=json.dumps(event))

    async def start_game_tournament(self, event):
        await self.send(text_data=json.dumps(event))

    async def win_tournament(self, event):
        await self.send(text_data=json.dumps(event))
