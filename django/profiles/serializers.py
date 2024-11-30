from rest_framework import serializers
from .models import ProfileModel
import base64

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    online = serializers.SerializerMethodField()
    is_friend = serializers.SerializerMethodField()
    has_incoming_request = serializers.SerializerMethodField()
    has_outgoing_request = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    match_history = serializers.JSONField(required=False)

    class Meta:
        model = ProfileModel
        fields = ['username', 'id', 'alias', 'victories', 'loses', 'points', 'online', 'is_friend',
                  'has_outgoing_request', 'has_incoming_request', 'avatar', 'match_history']

    def get_online(self, obj: ProfileModel):
        return obj.online

    def get_is_friend(self, obj: ProfileModel):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.pk == obj.pk:
            return False
        return obj.is_friend(request.user.profilemodel)

    def get_has_incoming_request(self, obj: ProfileModel):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.pk == obj.pk:
            return False
        return obj.is_friend_requesting(request.user.profilemodel)

    def get_has_outgoing_request(self, obj: ProfileModel):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.pk == obj.pk:
            return False
        return obj.is_friend_requested_by(request.user.profilemodel)

    def get_avatar(self, obj):
        if obj.avatar:
            return base64.b64encode(obj.avatar).decode('utf-8')
        return None