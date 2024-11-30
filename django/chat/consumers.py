import json
from channels.generic.websocket import WebsocketConsumer
from profiles.models import ProfileModel

class ChatConsumer(WebsocketConsumer):
    
    rooms = {}

    def connect(self):
        print("WS connected to Chat")

        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.user = self.scope['user']
        self.room_group_name = 'chat_%s' % self.room_name

        if not self.user.is_authenticated:
            self.close()
            return

        self.accept()

        # add client to room group
        self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        if self.room_name not in ChatConsumer.rooms:
            ChatConsumer.rooms[self.room_name] = []
            print(f"Room '{self.room_name}' created")
        else:
            print(f"Joining room '{self.room_name}'")

        # Add client to specific room
        ChatConsumer.rooms[self.room_name].append({
            'client': self,
            'user': ProfileModel.objects.get(user=self.user),
        })

    def disconnect(self, close_code):
        self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        if self.room_name in ChatConsumer.rooms:
            ChatConsumer.rooms[self.room_name] = [
                client for client in ChatConsumer.rooms[self.room_name] 
                if client['client'] != self
            ]
            
            if not ChatConsumer.rooms[self.room_name]:
                del ChatConsumer.rooms[self.room_name]
                print(f"Room '{self.room_name}' deleted")
            else:
                print(f"User left room '{self.room_name}'")
        
        # self.close_room()

    def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'chat_message')
        username = self.user.username

        if message_type == 'left_chat':
            self.handle_left_chat(username)
        elif message_type == 'chat_message':
            message = text_data_json.get('message', '')
            self.handle_chat_message(message, username)
        else:
            print(f"Unhandled message type: {message_type}")

    def handle_left_chat(self, username):
        pckg = {
            'type': 'left_chat',
            'username': username
        }
        self.broadcast_message(pckg)

    def handle_chat_message(self, message, username):
        pckg = {
            'type': 'chat_message',
            'message': message,
            'username': username
        }
        self.broadcast_message(pckg)

    def close_room(self):
        pckg = {
            'type': 'room_closed',
            'message': 'Room has been closed.'
        }
        if self.room_name in ChatConsumer.rooms:
            self.broadcast_message(pckg)
        else:
            print(f"Attempted to close non-existent room: {self.room_name}")

    def broadcast_message(self, message):
        if self.room_name in ChatConsumer.rooms:
            for client in ChatConsumer.rooms[self.room_name]:
                client['client'].send(text_data=json.dumps(message))
        else:
            print(f"Attempted to broadcast to non-existent room: {self.room_name}")