import { getTemplate } from "../utils/Template.js";
import PongGame from "../utils/PongModule.js";
import { navigateTo } from '../index.js';

export default class PongView {
    constructor(websocket) {
        this.title = "Pong";
        this.websocketService = null;
        this.roomName = null;
        this.pongGame = null;
        this.isActive = false;
        this.url = null;
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        this.handleRouteChange = this.handleRouteChange.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
    }

    async getHtml() {
        return getTemplate('pong');
    }

    async init(websocketService, url) {
        console.log("Beginning of init pong side, url: %s", url);
        this.websocketService = websocketService;
        this.url = url;

        // Extract room name from URL
        const urlParts = url.split('/');
        this.roomName = urlParts[urlParts.length - 1];

        const html = await this.getHtml();
        document.getElementById('app').innerHTML = html;

        // Set up event listeners
        window.addEventListener('popstate', this.handleRouteChange);
        window.addEventListener('beforeunload', this.handleBeforeUnload);

        // Set up WebSocket message handler
        this.setupMessageHandler();

        // Initialize game
        this.pongGame = new PongGame(this.websocketService, this.url);
        await this.pongGame.startPongGame();
        this.isActive = true;
    }

    setupMessageHandler() {
        if (this.websocketService && this.roomName) {
            this.websocketService.onMessage(this.roomName, (message) => {
                const data = JSON.parse(message.data);
                this.handleMessage(data);
            });
        }
    }

    handleMessage(data) {
        switch (data.type) {
            // case 'stop_game':
            //     this.handleGameTermination(data.reason);
            //     break;
            case 'player_left':
                // this.showNotification(`Player ${data.player_name} has left the game.`, 'warning');
                // this.handleGameTermination('player_left');
				this.handlePlayerLeft(data.player_name);
                break;
            case 'win':
                this.handleWin(data);
                break;
            case 'error':
                this.showNotification(data.message, 'error');
                break;
        }
    }
	handlePlayerLeft(playerName) {
		// this.handleGameTermination('player_left');
		this.createBanner('danger', `opponent has left the game`);
        navigateTo('/');
    }

    

    async handleGameTermination(reason = 'game_terminated') {
        if (this.isActive && this.pongGame) {
            try {
                // Notify server about game termination
                await fetch(`/api/game/${this.roomName}/terminate/`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken(),
                    },
                    body: JSON.stringify({ reason })
                });

                // Clean up game resources
                if (this.pongGame.scene && this.pongGame.renderer) {
                    this.pongGame.closeCanvas(
                        this.pongGame.scene,
                        this.pongGame.renderer,
                        this.pongGame.animID
                    );
                }

                // Clean up WebSocket connection
                if (this.websocketService && this.websocketService.connections[this.roomName]) {
                    this.websocketService.disconnect(this.roomName);
                }

                this.pongGame = null;
                this.isActive = false;

                // Hide game container if exists
                const gameContainer = document.getElementById('gameContainer');
                if (gameContainer) {
                    gameContainer.style.display = 'none';
                }

                if (reason === 'player_left') {
                    this.showNotification('Game ended: Player left the game', 'warning');
                    setTimeout(() => navigateTo('/'), 2000);
                }

            } catch (error) {
                console.error('Error terminating game:', error);
                this.showNotification('Error terminating game', 'error');
            }
        }
    }

    handleWin(data) {
        if (!this.isActive) return;

        const mainElement = document.querySelector('main');
        const winnerDisplay = document.createElement('div');
        winnerDisplay.className = 'winner-display';
        winnerDisplay.innerHTML = `
            <h1 class="winner-title">Game Winner</h1>
            <p class="winner-name">${data.winner}</p>
        `;
        mainElement.innerHTML = '';
        mainElement.appendChild(winnerDisplay);

        this.addWinnerStyles();
        
        setTimeout(() => {
            this.handleGameTermination('game_won');
            navigateTo('/');
        }, 5000);
    }

    addWinnerStyles() {
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
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    handleRouteChange(event) {
        if (this.isActive) {
            this.cleanup();
        }
    }

    handleBeforeUnload(event) {
        if (this.isActive) {
            event.preventDefault();
            event.returnValue = 'Are you sure you want to leave the game?';
            this.cleanup();
        }
    }

    async cleanup() {
        if (this.isActive) {
            await this.handleGameTermination();
            
            // Remove event listeners
            window.removeEventListener('popstate', this.handleRouteChange);
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
            
            this.isActive = false;
        }
    }

    getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken=')) {
                    cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
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

  createBanner(type, message) {
    const banner = document.createElement('div');
    banner.className = `alert ${type}`;
    banner.innerHTML = `
      ${this.getTypeAlertBanner(type)}
      <span>${message}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    this.bannerContainer.appendChild(banner);
    SetupBannerListener();
    setTimeout(() => {
      banner.remove();
    }, 4000);

    if (location.pathname === '/social') {
      navigateTo('/social');
    }
}
}