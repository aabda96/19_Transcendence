import { Request } from '../utils/Request.js';
import { getTemplate, setTemplateVar, getTemplateError } from '../utils/Template.js';
import PongGame from "../utils/PongModule.js";
import { navigateTo } from '../index.js';

export default class TournamentView {
    constructor() {
        this.title = 'Tournament';
        this.websocketService = null;
        this.url = null;
        this.lobbyName = null;
        this.maxPlayers = 4;
        this.game = null;
        this.winners = [];
        this.currentUsers = [];
        this.tournament_ready = false;
        this.flag = true;
        this.allowedtoaddplayer = true;
        this.isActive = false;
        this.isOrganizer = true;
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
		this.handleRouteChange = this.handleRouteChange.bind(this);
    }


    async getHtml() {
        try {
            const template = await getTemplate('tournament');
            return setTemplateVar(template, {});
        } catch (error) {
            console.error('Error loading template:', error);
            return getTemplateError('tournament');
        }
    }

    async connectToRoom(room, url) {
        console.log("in connectToRoom, room : %s, url : %s", room, url);
        return new Promise((resolve) => {
            this.websocketService.connectToRoom(room, url, resolve);
        });
    }

    async sendMessage(room, message) {
        this.websocketService.send(room, JSON.stringify(message));
    }

    async init(websocketService, url) {
        const me = await Request('GET', '/api/profiles/me');
        this.websocketService = websocketService;
        this.url = url;
        const html = await this.getHtml();
        document.querySelector('main').innerHTML = html;
        await this.islobbyexist();

        if (!this.lobbyName) {
            // this.lobbyName = "tournament" + me.username;
            this.lobbyName = me.username;
            this.isOrganizer = true;
            await this.createLobby();
        } else {
            // this.isOrganizer = (this.lobbyName === me.username);
            this.isOrganizer = true;
            await this.connectToRoom(this.lobbyName, this.url);
            await this.sendMessage(this.lobbyName, {
                'type': 'join_lobby',
                'player_name': me.username,
                'tournament_name': this.lobbyName
            });
        }
        
        this.setupMessageHandler(this.lobbyName);
        await this.userHandling();

        const btnLaunchTournament = document.getElementById('btnLaunchTournament');
        if (btnLaunchTournament) {
            btnLaunchTournament.addEventListener('click', () => this.launchTournament());
        }

        this.isActive = true;
        window.addEventListener('popstate', this.handleRouteChange);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
    handleRouteChange(event) {
        if (this.isActive) {
            this.leaveTournament();
        }
    }
	leaveTournament() {
        if (this.isActive && this.lobbyName) {
            const message = this.isOrganizer ? this.sendCancelTournamentMessage() : this.sendLeaveTournamentMessage();
            this.cleanup();
        }
    }
	handleBeforeUnload(event) {
        if (this.isActive) {
            // Show a confirmation dialog if the tournament hasn't started
            event.preventDefault();
            event.returnValue = 'Are you sure you want to leave the tournament?';
            this.leaveTournament();
        }
    }
	async sendLeaveTournamentMessage() {
        if (this.websocketService && this.lobbyName) {
            const me = await Request('GET', '/api/profiles/me');
            await this.sendMessage(this.lobbyName, {
                'type': 'leave_tournament',
                'player_name': me.username,
                'tournament_name': this.lobbyName,
                'is_organizer': this.isOrganizer
            });
        }
    }

    async sendCancelTournamentMessage() {
        if (this.websocketService && this.lobbyName) {
            await this.sendMessage(this.lobbyName, {
                'type': 'cancel_tournament',
                'tournament_name': this.lobbyName
            });
        }
    }
	async getAliasByUsername(username) {
		try {
		  const data = await Request('GET', `/api/profiles/user/${username}`);
		  return data.alias;
		}	catch (error) {
		console.error('Error fetching alias:', error);
		return null;
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
	async islobbyexist(){
		let pathname = window.location.pathname;
		const urlParts = pathname.split('/');
		const potentiallobby = urlParts[urlParts.length - 1];
		const users = await Request('GET', '/api/profiles/');
		const lobbyExists = users.some(user => user.username === potentiallobby);
		if (lobbyExists) {
			this.allowedtoaddplayer = false;
			this.lobbyName = potentiallobby;
		} else {
			this.lobbyName = null;
		}
	}
    async createLobby() {
        const me = await Request('GET', '/api/profiles/me');
        this.url = '/tournament';
        await this.connectToRoom(this.lobbyName, this.url);
        
        await this.sendMessage(this.lobbyName, {
            'type': 'create_lobby',
            'max_players': this.maxPlayers,
            'tournament_name': this.lobbyName
        });
        
        await this.sendMessage(this.lobbyName, {
            'type': 'join_lobby',
            'player_name': me.username,
            'tournament_name': this.lobbyName
        });

        this.currentUsers = [me.username];
        this.updatePlayersList();
    }


    setupMessageHandler(room) {
        this.websocketService.onMessage(room, (message) => {
            const parsedData = JSON.parse(message.data);
            this.handleMessage(parsedData);
        });
    }
    handleMessage(data) {
        const lobbyMessage = document.getElementById('lobby-message');
        switch (data.type) {
            case 'update_lobby':
                console.log("Received update_lobby message:", data);
                if (Array.isArray(data.players)) {
                    this.currentUsers = [...data.players];
                    console.log("Updated currentUsers:", this.currentUsers);
                    requestAnimationFrame(() => {
                        this.updatePlayersList();
                        if (this.currentUsers.length === this.maxPlayers) {
                            this.tournament_ready = true;
                        }
                    });
                }
                break;
            case 'player_left':
                const message = data.is_organizer ? 
                    "Tournament has been cancelled because one of the player left." :
                    `Player ${data.player_name} has left the tournament.`;
                this.showNotification(message, 'warning');
                if (data.redirect || data.is_organizer) {
                    this.cleanup();
                    navigateTo('/');
                }
                break;
            case 'tournament_cancelled':
                this.showNotification("Tournament has been cancelled by the organizer.", 'warning');
                this.cleanup();
                navigateTo('/');
                break;
            case 'start_tournament':
            case 'lobby_created':
            case 'error':
                if (lobbyMessage) lobbyMessage.textContent = data.message;
                break;
            case 'start_game_tournament':
                console.log("About to start a game in tournament");
                console.log(data);
                this.handleStartGame(data);
                break;
            case 'win':
                console.log("data received by back WIN", data);
                this.handleWin(data.winner, data.tournament_name);
                break;
            case 'win_tournament':
                this.handleTournamentWin(data.winner);
                break;
			case 'tournament_full':
				this.tournament_ready = true;
				this.updatePlayersList();
        }
    }
    handleStartGame(data) {
        const gameRoomName = data.room_name;
        const tournamentName = data.tournament_name;

        console.log("ROOM : ", gameRoomName);
        console.log("TOURNAMENT : ", tournamentName);

        // if (this.game) {
        //     this.game.cleanup();
        // }
        this.game = new PongGame(this.websocketService, "/game");
        // console.log("Just created a PongGame instance");
        this.game.setRoomName(gameRoomName);
        this.game.startPongGame();
        console.log("Game started in room: ", gameRoomName);
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            const   sectionElem = document.getElementById('pong');
            sectionElem.innerHTML = '';
            gameContainer.style.display = 'block';
            sectionElem.appendChild(gameContainer);
        }
    }
    async userHandling() {
		const me = await Request('GET', '/api/profiles/me');
		const users = await Request('GET', '/api/profiles/');
		const ulListOfUsersElem = document.getElementById('listOfUsersUl');
	
		if (ulListOfUsersElem) {
			ulListOfUsersElem.innerHTML = '';
			if (this.allowedtoaddplayer) {
				users.forEach(user => {
					if (user.online && user.id != me.id && !this.currentUsers.includes(user.username)) {
						const liElem = document.createElement('li');
						liElem.classList.add('user-item');
						liElem.innerHTML = `
							${user.username}
							<span class="itemInvite itemChat"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span>
						`;
						ulListOfUsersElem.appendChild(liElem);
					}
				});
				this.inviteHandling();
			} else {
				const messageElem = document.createElement('li');
				messageElem.classList.add('info-message');
				messageElem.textContent = "You cannot invite players to this tournament.";
				ulListOfUsersElem.appendChild(messageElem);
			}
		}
	}

    inviteHandling() {
        const liUserElem = document.querySelectorAll('li.user-item');
        liUserElem.forEach(e => {
            const inviteButton = e.querySelector('.itemInvite');
            if (inviteButton) {
                inviteButton.addEventListener('click', () => {
                    const username = e.textContent.trim();
                    this.inviteUser(username);
                });
            }
        });
    }
	async inviteUser(username) {
        if (this.currentUsers.length < this.maxPlayers) {
            try {
                const notificationSuccess = await this.message_notif_game(username);
                
                if (notificationSuccess) {
                    this.currentUsers.push(username);
                    // this.updatePlayersList();
                    this.userHandling(); 
                } else {
                    console.log(`Failed to invite ${username}`);
                    this.showNotification(`Failed to invite ${username}. Please try again.`, 'error');
                }
            } catch (error) {
                console.error("Error in invite process:", error);
                this.removeUserFromInvited(username);
                this.showNotification(`Unable to invite ${username}. They may not be available.`, 'error');
            }
        } else {
            this.showNotification("Lobby is full", 'warning');
        }
    }

    removeUserFromInvited(username) {
        this.currentUsers = this.currentUsers.filter(user => user !== username);
        this.updatePlayersList();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    cleanup() {
        console.log("Cleaning up tournament view");
        this.isActive = false;
        
        // Remove event listeners
        window.removeEventListener('popstate', this.handleRouteChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        // Disconnect from websocket
        if (this.websocketService && this.lobbyName) {
            if (this.isOrganizer) {
                // If organizer is leaving before tournament starts, send cancel message
                this.sendCancelTournamentMessage();
            } else if (!this.tournament_ready) {
                // If regular player leaving before tournament starts, send leave message
                this.sendLeaveTournamentMessage();
            }
            this.websocketService.disconnect(this.lobbyName);
        }
    }

    async message_notif_game(username) {
        try {
			if (this.currentUsers.includes(username)) {
				console.log("User already invited:", username);
				return false;
			}
            console.log("Sending notification for username:", username);
            const friendProfile = await this.getProfileByUsername(username);
            
            if (!friendProfile) {
                console.error("Could not find profile for username:", username);
                return false;
            }
            const username_id = friendProfile.id;
            const csrftoken = this.getCSRFToken();
            const response = await Request(
                'POST',
                `/api/profiles/tournament/${username_id}`,
                { username },
                { 'X-CSRFToken': csrftoken },
            );
            return response && response.status !== 'error';
        } catch (error) {
            console.error('Error sending message invitation:', error);
            return false;
        }
    }

    updatePlayersList() {
        const tournamentUsersUl = document.getElementById('tournamentUsersUl');
        console.log("Updating players list with users:", this.currentUsers);
        
        if (tournamentUsersUl) {
            // Clear existing list
            tournamentUsersUl.innerHTML = '';
            
            // Create and append user elements
            this.currentUsers.forEach(player => {
                const li = document.createElement('li');
                li.textContent = player;
                li.classList.add('invitedUser');
                tournamentUsersUl.appendChild(li);
            });

            // Update button state
            const btnLaunchTournament = document.getElementById('btnLaunchTournament');
            if (btnLaunchTournament) {
                const shouldEnable = this.currentUsers.length === this.maxPlayers;
                btnLaunchTournament.disabled = !shouldEnable;
                this.tournament_ready = shouldEnable;
            }
        } else {
            console.error("tournamentUsersUl element not found");
        }
    }

    launchTournament() {
		console.log("Launching tournament");
        if (this.currentUsers.length % 2 == 0) {
            this.sendMessage(this.lobbyName, {
                'type': 'start_tournament',
				'max_players': this.maxPlayers,
                'tournament_name': this.lobbyName
            });
        } else {
            console.log("Cannot start tournament: not enough players");
        }
    }

    handleWin(winner, tournamentName) {
        if (!this.winners.includes(winner)) {
            this.winners.push(winner);
        }
        console.log("Current winners: ", this.winners);
        const winnersList = document.getElementById('winners-list');
        if (winnersList) {
            const li = document.createElement('li');
            li.textContent = winner;
            winnersList.appendChild(li);
        }
		if (this.flag){
			this.maxPlayers = this.maxPlayers / 2;
			this.flag = false;
		if (this.maxPlayers === 1) {
			this.handleTournamentWin(this.winners[0]);
			return;
		}
		}
        if (this.winners.length == this.maxPlayers) {
            this.startNextRound(tournamentName);
        }
        else {
            console.log("Waiting for more winners to start the next round");
        }
    }

    startNextRound(tournamentName) {
		this.flag = true;
        console.log("Starting next round");
        this.sendMessage(tournamentName, {
            'type': 'start_next_round',
            'winners': this.winners,
            'tournament_name': tournamentName
        });
        this.winners = [];
    }

    handleTournamentWin(winner) {
        console.log("JUST RECEIVED THE MESSAGE THAT SOMEONE HAS WONNNN")
		this.websocketService.disconnect(this.lobbyName);
        const mainElement = document.querySelector('main');
        const winnerDisplay = document.createElement('div');
        winnerDisplay.className = 'winner-display';
        winnerDisplay.innerHTML = `
            <h1 class="winner-title">Tournament Winner</h1>
            <p class="winner-name">${winner}</p>
        `;
        mainElement.innerHTML = '';
        mainElement.appendChild(winnerDisplay);
        const style = document.createElement('style');
        style.textContent = `
            .winner-display {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                font-family: Arial, sans-serif;
                animation: fadeIn 1s ease-out;
            }
            .winner-title {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            .winner-name {
                font-size: 5rem;
                font-weight: bold;
                text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff;
                animation: pulse 2s infinite;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        setTimeout(() => {
            navigateTo('/');
        }, 5000);
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