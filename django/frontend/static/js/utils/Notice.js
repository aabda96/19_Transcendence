import { navigateTo } from '../index.js';
import { Request } from './Request.js';	
import { SetupBannerListener } from '../utils/BannerListener.js';

export default class Notice {
    constructor() {
        this.url = location.origin.replace('http', 'ws') + '/ws/notice';
        this.bannerContainer = document.getElementById('banner-container');
        this.start();
		this.myData = null;
    }

    async start() {
		this.myData = await Request('GET', '/api/profiles/me');
        this._socket = new WebSocket(this.url);
        this._socket.onopen = _ => console.log('Notice socket connected');
        this._socket.onclose = _ => this._socket = undefined;
        this._socket.onmessage = async message => {
            const data = JSON.parse(message.data);
            console.log(data);
            if (data.type === 'friend_request') {
                this.createBanner('info', data.author.username, 'sent you a friend request.');
            } else if (data.type === 'new_friend') {
                this.createBanner('success', data.friend.username, 'accepted your friend request.');
            } else if (data.type === 'friend_removed') {
                this.createBanner('warning', data.friend.username, 'removed you from their friend list.');
            } else if (data.type === 'friend_request_canceled') {
                this.createBanner('info', 'Friend request canceled');
            } else if (data.type === 'online' || data.type === 'offline') {
                if (location.pathname === '/social') {
                    navigateTo('/social');
                }
            } else if (data.type === 'chat'){
                this.createChatBanner(data.author.username);
            } else if (data.type == 'chat_declined'){
                this.createBanner('danger', data.author.username, 'declined your chat request.');
                navigateTo('/');
                navigateTo('/chat');
            } else if (data.type === 'chat_accepted') {
                this.createBanner('success', data.author.username, 'accepted your chat request, you can now chat');
                navigateTo('/chat/' + `${data.author.username}`);
            } else if (data.type === 'game'){
                this.createGameBanner(data.author.username);
            } else if (data.type == 'game_declined'){
                this.createBanner('danger', data.author.username, 'declined your game request.');
                navigateTo('/');
                navigateTo('/chat');
            } else if (data.type === 'game_accepted') {
                this.createBanner('success', data.author.username, 'accepted your game request');
                // navigateTo('/game/' + `${data.author.username}`);
				const currentUser = this.getCurrentUser();
                navigateTo(`/game/game_${currentUser.username}_${data.author.username}`);
                // navigateTo('/game');
            } else if (data.type === 'tournament'){
                this.createGameBannerTournament(data.author.username);
            } else if (data.type == 'game_tournament_declined'){
                this.createBanner('danger', data.author.username, 'declined your game request, tournament cancelled');
				navigateTo('/tournament');
            } else if (data.type === 'game_tournament_accepted') {
                this.createBanner('success', data.author.username, 'accepted your game request');
				// const currentUser = this.getCurrentUser();
                // navigateTo(`/tournament/${data.author.username}`);
                // navigateTo('/game');
            }
        };
    }

    getTypeAlertBanner(type) {
        switch (type) {
            case 'info':
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
            case 'warning':
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
            case 'success':
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';
            case 'danger':
            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
            default:
            return;
        }
    }

    createBanner(type, username=null, message) {
        const banner = document.createElement('div');
        banner.className = `alert ${type}`;
        banner.innerHTML = `
            ${this.getTypeAlertBanner(type)}
            <span>${username ? `<strong>${username}</strong> `: ''}${message}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        `;
        this.bannerContainer.appendChild(banner);
        SetupBannerListener();
        setTimeout(() => {
            banner.remove();
        }, 4000);

		console.log('location.pathname:', location.pathname);

        if (location.pathname === '/social') {
            navigateTo('/social');
		} else if (location.pathname === '/chat' && type === 'info') {
			navigateTo('/chat');
        }
    }
	createChatBanner(username) {
        const banner = document.createElement('div');
        banner.className = 'alert info';
        banner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><strong>${username}</strong> invite you to chat. Would you like to chat ?</span>
          <div class="btnNotifContainer">
            <button class="yes-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
            <button class="no-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        `;
        this.bannerContainer.appendChild(banner);
        this.setupChatBannerListeners(banner, username);
    }
	createGameBanner(username) {
		console.log('Game banner created');
        const banner = document.createElement('div');
        banner.className = 'alert info';
        banner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><strong>${username}</strong> invites you to play. Would you like to play?</span>
          <div class="btnNotifContainer">
            <button class="yes-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
            <button class="no-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        `;
        this.bannerContainer.appendChild(banner);
        this.setupGameBannerListeners(banner, username);
    }

    setupGameBannerListeners(banner, username) {
        const yesButton = banner.querySelector('.yes-btn');
        const noButton = banner.querySelector('.no-btn');

        yesButton.addEventListener('click', async () => {
            try {
                this.acceptGame(username);
				// navigateTo('/game/' + username);
				const currentUser = this.getCurrentUser();
                navigateTo(`/game/game_${username}_${currentUser.username}`);
            } catch (error) {
                console.error('Error starting game:', error);
            }
            banner.remove();
        });

        noButton.addEventListener('click', () => {
            console.log(`User declined to play with ${username}`);
            this.declineGame(username);
            banner.remove();
        });
    }

    async declineGame(username) {
        try {
            const friendProfile = await this.getProfileByUsername(username);
            const username_id = friendProfile.id;
            console.log('Declining game with:', username_id);
            console.log('Declining game with:', username);
            const csrftoken = this.getCSRFToken();
            await Request('POST', `/api/profiles/game_declined/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
        } catch (error) {
            console.error('Error declining game:', error);
        }
    }

    async acceptGame(username) {
        try {
            const friendProfile = await this.getProfileByUsername(username);
            const username_id = friendProfile.id;
            console.log('Accepting game with:', username_id);
            console.log('Accepting game with:', username);
            const csrftoken = this.getCSRFToken();
            await Request('POST', `/api/profiles/game_accepted/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
        } catch (error) {
            console.error('Error accepting game:', error);
        }
    }
	createGameBannerTournament(username) {
		console.log('Tournament banner created');
        const banner = document.createElement('div');
        banner.className = 'alert info';
        banner.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span><strong>${username}</strong> invites you to play. Would you like to play?</span>
          <div class="btnNotifContainer">
            <button class="yes-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </button>
            <button class="no-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        `;
        this.bannerContainer.appendChild(banner);
        this.setupGameBannerListenersTournament(banner, username);
    }

    setupGameBannerListenersTournament(banner, username) {
        const yesButton = banner.querySelector('.yes-btn');
        const noButton = banner.querySelector('.no-btn');

        yesButton.addEventListener('click', async () => {
            try {
                this.acceptGameTournament(username);
			
				// const currentUser = this.getCurrentUser();
                navigateTo(`/tournament/${username}`);
            } catch (error) {
                console.error('Error starting game:', error);
            }
            banner.remove();
        });

        noButton.addEventListener('click', () => {
            console.log(`User declined to play with ${username}`);
            this.declineGameTournament(username);
            banner.remove();
        });
    }

    async declineGameTournament(username) {
        try {
            const friendProfile = await this.getProfileByUsername(username);
            const username_id = friendProfile.id;
            const csrftoken = this.getCSRFToken();
            await Request('POST', `/api/profiles/tournament_declined/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
        } catch (error) {
            console.error('Error declining game:', error);
        }
    }

    async acceptGameTournament(username) {
        try {
            const friendProfile = await this.getProfileByUsername(username);
            const username_id = friendProfile.id;
            const csrftoken = this.getCSRFToken();
            await Request('POST', `/api/profiles/tournament_accepted/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
        } catch (error) {
            console.error('Error accepting game:', error);
        }
    }

    setupChatBannerListeners(banner, username) {
        const yesButton = banner.querySelector('.yes-btn');
        const noButton = banner.querySelector('.no-btn');

        yesButton.addEventListener('click', async () => {
            try {
					this.acceptChat(username);
                    navigateTo('/chat/' + username);
            } catch (error) {
                console.error('Error starting private chat:', error);
            }
            banner.remove();
        });

        noButton.addEventListener('click', () => {
            console.log(`User declined to chat with ${username}`);
			this.declineChat(username);
            banner.remove();
        });
    }


	async declineChat(username) {
		try {
			const friendProfile = await this.getProfileByUsername(username);
			const username_id = friendProfile.id;
			console.log('Declining chat with:', username_id);
			console.log('Declining chat with:', username);
			const csrftoken = this.getCSRFToken();
			await Request('POST', `/api/profiles/chat_declined/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
		}
			catch (error) {
				console.error('Error declining chat:', error);
			}
	}

	async acceptChat(username) {
		try {
			const friendProfile = await this.getProfileByUsername(username);
			const username_id = friendProfile.id;
			console.log('Accepting chat with:', username_id);
			console.log('Accepting chat with:', username);
			const csrftoken = this.getCSRFToken();
			await Request('POST', `/api/profiles/chat_accepted/${username_id}`, {username}, { 'X-CSRFToken': csrftoken });
		}
		catch (error) {
			console.error('Error accepting chat:', error);
		}
	}

	async getProfileByUsername(username) {
		try {
			const data = await Request('GET', `/api/profiles/user/${username}`);
			return data;
		} catch (error) {
			console.error('Error fetching profile:', error);
			return null;
		}
	}
	getCurrentUser() {
        if (!this.myData) {
            throw new Error('User data not available. Make sure start() has been called.');
        }
        return this.myData;
    }
	getCSRFToken() {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
		  const cookies = document.cookie.split(';');
		  for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, 'csrftoken'.length + 1) === 'csrftoken' + '=') {
			  cookieValue = decodeURIComponent(
				cookie.substring('csrftoken'.length + 1),
			  );
			  break;
			}
		  }
		}
		return cookieValue;
	  }
}



