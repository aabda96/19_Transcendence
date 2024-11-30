from django.contrib.auth import get_user_model,authenticate, login, logout
from django.http import JsonResponse
from django.shortcuts import render
from django.middleware.csrf import get_token
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import CustomUserSerializer
import json
from django.contrib.auth import authenticate, login, logout
import re
from django.conf import settings
from urllib.parse import quote
import logging
from django.shortcuts import redirect
import requests
from django.http import HttpResponseRedirect, JsonResponse

User = get_user_model()

def login_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({'status': 'success', 'username': user.username})
        else:
            return JsonResponse({'status': 'fail', 'error': 'Invalid credentials'}, status=401)
    else:
        csrf_token = get_token(request)
        return render(request, 'login.html', {'csrf_token': csrf_token, 'hostname': settings.HOSTNAME})

def logout_view(request):
    logout(request)
    return JsonResponse({'status': 'logged_out'})

def user_info(request):
    if request.user.is_authenticated:
        return JsonResponse({'username': request.user.username})
    else:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

def index_view(request):
    return render(request, 'index.html')

def register_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            # Validate username length
            if not (5 <= len(username) <= 15):
                return JsonResponse({'status': 'fail', 'error': 'Username must be between 5 and 15 characters long'}, status=400)
            # Check if the username already exists
            if User.objects.filter(username=username).exists():
                return JsonResponse({'status': 'fail', 'error': 'Username is already taken'}, status=400)
            # Validate password length
            if not (8 <= len(password) <= 20):
                return JsonResponse({'status': 'fail', 'error': 'Password must be between 8 and 20 characters long'}, status=400)
            # Validate password complexity
            if not re.search(r'[A-Z]', password):
                return JsonResponse({'status': 'fail', 'error': 'Password must contain at least one uppercase letter'}, status=400)
            if not re.search(r'[a-z]', password):
                return JsonResponse({'status': 'fail', 'error': 'Password must contain at least one lowercase letter'}, status=400)
            if not re.search(r'\d', password):
                return JsonResponse({'status': 'fail', 'error': 'Password must contain at least one digit'}, status=400)
            if not username or not password:
                return JsonResponse({'status': 'fail', 'error': 'Username and password are required'}, status=400)

            user = User.objects.create_user(username=username, password=password)
            user.save()
            return JsonResponse({'status': 'success'})

        except json.JSONDecodeError:
            return JsonResponse({'status': 'fail', 'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'fail', 'error': str(e)}, status=400)
    else:
        csrf_token = get_token(request)
        return render(request, 'register.html', {'csrf_token': csrf_token})

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = CustomUserSerializer(user)
        return Response(serializer.data)

def update_alias(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            new_alias = data.get('alias')
            
            if not request.user.is_authenticated:
                return JsonResponse({'status': 'error', 'message': 'User is not authenticated'}, status=403)
            
            if new_alias is None or new_alias.strip() == "":
                return JsonResponse({'status': 'error', 'message': 'Alias not provided or empty'}, status=400)
            
            # Update the alias for the authenticated user's profile
            profile = request.user.profilemodel
            profile.alias = new_alias
            profile.save()

            return JsonResponse({'status': 'success'})
        
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)
        except ProfileModel.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

class OAuthLoginView(APIView):
    def get(self, request):
        try:
            client_id = settings.API42_UID
            referral_url = request.GET.get('referral_url', f"https://{settings.HOSTNAME}")
            request.session['referral_url'] = referral_url
            referral_url = quote(referral_url)
            authorization_url = f'https://api.intra.42.fr/oauth/authorize?client_id={client_id}&response_type=code&redirect_uri={referral_url}/api/oauth/authorize/'
            return HttpResponseRedirect(authorization_url)
        except Exception as e:
            logging.error(str(e))
            return HttpResponseRedirect('/login')

class OAuthAuthorizeView(APIView):
    def get(self, request):
        try:
            code = request.GET.get('code')
            # print (code)
            if not code:
                return JsonResponse({'error': 'Code parameter is missing'}, status=400)
            if len(code) != 64 or not re.match(r'^[a-zA-Z0-9]+$', code):
                return JsonResponse({'error': 'Invalid code format'}, status=400)
            client_id = settings.API42_UID
            client_secret = settings.API42_SECRET
            redirect_uri = request.session.get('referral_url', f"https://{settings.HOSTNAME}") + '/api/oauth/authorize/'
            csrf_token = get_token(request)
            if not client_id or not client_secret or not redirect_uri:
                return JsonResponse({'error': 'Environment variables are not set correctly'}, status=400)
            data = {
                'grant_type': 'authorization_code',
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'redirect_uri': redirect_uri,
                'csrfToken': csrf_token,
            }
            response = requests.post('https://api.intra.42.fr/oauth/token', data=data)
            response.raise_for_status()
            access_token = response.json().get('access_token')
            user_data_response = requests.get('https://api.intra.42.fr/v2/me', headers={'Authorization': f'Bearer {access_token}'})
            user_data_response.raise_for_status()
            user_data = user_data_response.json()
            username = user_data.get('login')
            email = user_data.get('email')
            image_data = user_data.get('image', {})
            image_link = image_data.get('versions', {}).get('medium', image_data.get('link'))
            password = settings.SOCIAL_AUTH_PASSWORD
            try:
                user = User.objects.get(username=username)
                while not user.is_oauth_user and User.objects.filter(username=username).exists():
                    username = username + str(User.objects.filter(username=username).count())
                    user = User.objects.get(username=username)
                user = User.objects.get(username=username)
                user = authenticate(request, username=username, password=password)
                # user.is_active = True
                # user.save()
                login(request, user)
                csrf_token = get_token(request)
                return redirect('/')
                # return render(request, 'index.html', {'csrf_token': csrf_token})
            except User.DoesNotExist:
                    user = User.objects.create_user(username=username, email=email, password=password)
                    user.is_oauth_user = True
                    
                    # user.is_active = True
                    user.save()
                    user = authenticate(request,username=username, password=password)
                    login(request, user)
                    csrf_token = get_token(request)
                    return redirect('/')
        except requests.RequestException as e:
            return JsonResponse({'error': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
