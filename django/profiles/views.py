from rest_framework import permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .serializers import ProfileSerializer
from .models import ProfileModel, FriendRequestModel, BlockModel
from .serializers import ProfileSerializer
from .consumers import notice_manager
from django.utils.translation import gettext as _



class AllProfile(viewsets.ModelViewSet):
    queryset = ProfileModel.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def retrieve(self, request, username=None):
        User = get_user_model()
        user = get_object_or_404(User, username=username)
        serializer = self.serializer_class(user.profilemodel, context={'request': request})
        return Response(serializer.data)

    def retrieve_id(self, request, pk=None):
        User = get_user_model()
        user = get_object_or_404(User, pk=pk)
        serializer = self.serializer_class(user.profilemodel, context={'request': request})
        return Response(serializer.data)

    def list(self, request):
        serializer = ProfileSerializer(self.get_queryset(), many=True, context={'request': request})
        return Response(serializer.data)


class GetFriendsView(APIView):  #  Retrieves a list of friends for the authenticated user
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        return Response(ProfileSerializer(request.user.profilemodel.get_friends(), many=True).data)
class chat(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        print('chat')
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        # notice_manager.send_message(user_profile, friend_profile)
        notice_manager.send_message(friend_profile.user, user_profile)
        print(user_profile, friend_profile)
        print(friend_profile.user)
        return Response(('Message sent.'), status.HTTP_200_OK)
class game(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.send_message_game(friend_profile.user, user_profile)
        return Response(('Message sent.'), status.HTTP_200_OK)
class game_declined(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.game_declined(friend_profile.user, user_profile)
        return Response(('game declined.'), status.HTTP_200_OK)
class chat_declined(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        print('chat_declined')
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.chat_declined(friend_profile.user, user_profile)
        return Response(('chat declined.'), status.HTTP_200_OK)
class chat_accepted(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        print('chat_accepted')
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.chat_accepted(friend_profile.user, user_profile)
        return Response(('chat accepted.'), status.HTTP_200_OK)
class game_accepted(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    def get_object(self):
        return self.request.user.profilemodel
    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.game_accepted(friend_profile.user, user_profile)
        return Response(('game accepted.'), status.HTTP_200_OK)
class tournament(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get_object(self):
        return self.request.user.profilemodel

    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.send_message_game_tournament(friend_profile.user, user_profile)
        return Response(('Message sent.'), status.HTTP_200_OK)

class tournament_declined(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get_object(self):
        return self.request.user.profilemodel

    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.game_tournament_declined(friend_profile.user, user_profile)
        return Response(('game declined.'), status.HTTP_200_OK)

class tournament_accepted(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get_object(self):
        return self.request.user.profilemodel

    def post(self, request, pk=None):
        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        notice_manager.game_tournament_accepted(friend_profile.user, user_profile)
        return Response(('game accepted.'), status.HTTP_200_OK)

class EditFriendView(APIView): # Manage friends requests and friendship
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get_object(self):
        return self.request.user.profilemodel

    def post(self, request, pk=None):

        user_profile: ProfileModel = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        if user_profile.pk == pk:
            return Response(('You can\'t be friend with yourself.'), status.HTTP_400_BAD_REQUEST)
        if user_profile.is_friend(friend_profile):
            return Response(('You are already friend with this user.'), status.HTTP_400_BAD_REQUEST)
        if user_profile.is_friend_requesting(friend_profile):
            return Response(('You already sent a request to this user.'), status.HTTP_400_BAD_REQUEST)
        incoming_request = user_profile.get_received_friend_request_from(friend_profile)
        if incoming_request:
            incoming_request.accept()
            notice_manager.notify_new_friend(friend_profile.user, user_profile)
            return Response(('Friendship successfully created.'), status.HTTP_201_CREATED)
        FriendRequestModel(author=user_profile, target=friend_profile).save()
        notice_manager.notify_friend_request(friend_profile.user, user_profile)
        return Response(('Friend request sent.'), status.HTTP_200_OK)

    def delete(self, request, pk=None):
        user_profile = self.get_object()
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        outgoing_request = user_profile.get_outgoing_friend_request_to(friend_profile)
        if outgoing_request:
            outgoing_request.delete()
            notice_manager.notify_friend_request_canceled(friend_profile.user, user_profile)
            return Response(('Friend request cancelled.'))
        if not user_profile.is_friend(friend_profile):
            return Response(('You are not friend with this user.'), status.HTTP_400_BAD_REQUEST)
        user_profile.delete_friend(friend_profile)
        notice_manager.notify_friend_removed(friend_profile.user, user_profile)
        return Response(('Friendship successfully deleted.'), status.HTTP_201_CREATED)

class deletefriendrequest(APIView):
    def delete(self, request, pk=None):
        user_profile = ProfileModel.objects.get(user=request.user)
        friend_profile = get_object_or_404(ProfileModel, pk=pk)
        incoming_request = user_profile.get_received_friend_request_from(friend_profile)
        if incoming_request:
            incoming_request.decline()
            notice_manager.notify_friend_request_canceled(friend_profile.user, user_profile)
            return Response(('Friend request cancelled.'))

class GetIncomingFriendRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        requests = request.user.profilemodel.get_incoming_friend_requests()
        profiles = [request.author for request in requests]
        return Response(ProfileSerializer(profiles, many=True).data)

class GetOutgoingFriendRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get(self, request):
        requests = request.user.profilemodel.get_outgoing_friend_requests()
        profiles = [request.target for request in requests]
        return Response(ProfileSerializer(profiles, many=True).data)


class UserProfile(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)
    serializer_class = ProfileSerializer
    queryset = ProfileModel.objects.all()

    def get_object(self):
        return self.request.user.profilemodel

    def perform_update(self, serializer: ProfileSerializer, pk=None):
        serializer.is_valid(raise_exception=True)
        profile: ProfileModel = self.get_object()

    def retrieve(self, pk=None):
        return Response(self.serializer_class(self.get_object(), context={'user': self.request.user}).data)


import base64
from django.http import JsonResponse

class UploadAvatarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_profile = request.user.profilemodel
        user_profile.avatar = request.FILES['avatar'].read()
        user_profile.save()
        return Response({'status': 'success'})

class GetAvatarView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            user_profile = ProfileModel.objects.get(user=request.user)
            if user_profile.avatar:
                avatar_base64 = base64.b64encode(user_profile.avatar).decode('utf-8')
                return JsonResponse({'avatar': f'data:image/png;base64,{avatar_base64}'})
            else:
                return JsonResponse({'avatar': 'No avatar'}, status=404)
        except ProfileModel.DoesNotExist:
            return JsonResponse({'error': 'Profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)


class GetBlocksView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get(self, request: Request):
        blocks = BlockModel.objects.filter(blocker=request.user.profilemodel)
        bloked_profiles = [block.blocked for block in blocks]

        return Response(ProfileSerializer(bloked_profiles, many=True).data)
class GetwhoBlocksMeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get(self, request: Request):
        blocks = BlockModel.objects.filter(blocked=request.user.profilemodel)
        bloked_profiles = [block.blocker for block in blocks]

        return Response(ProfileSerializer(bloked_profiles, many=True).data)


class EditBlocksView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    authentication_classes = (SessionAuthentication,)

    def get_object(self):
        return self.request.user.profilemodel

    def post(self, request, pk=None):
        user_profile = self.get_object()
        blocked_profile = get_object_or_404(ProfileModel, pk=pk)

        if user_profile.pk == pk:
            return Response(_('You can\'t block yourself.'), status.HTTP_400_BAD_REQUEST)

        if BlockModel.objects.filter(blocker=user_profile, blocked=blocked_profile):
            return Response(_('You already blocked this user.'), status.HTTP_409_CONFLICT)

        BlockModel(blocker=user_profile, blocked=blocked_profile).save()
        return Response(_('User successfully blocked.'), status.HTTP_201_CREATED)

    def delete(self, request, pk=None):
        user_profile = self.get_object()
        blocked_profile = get_object_or_404(ProfileModel, pk=pk)

        if user_profile.pk == pk:
            return Response(_('You can\'t unblock yourself.'), status.HTTP_400_BAD_REQUEST)

        block_record = BlockModel.objects.filter(blocker=user_profile, blocked=blocked_profile).first()
        if not block_record:
            return Response(_('This user is not blocked.'), status.HTTP_400_BAD_REQUEST)

        block_record.delete()
        return Response(_('User successfully unblocked.'), status.HTTP_200_OK)