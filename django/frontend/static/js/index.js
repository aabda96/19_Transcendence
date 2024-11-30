import HomeView from './views/HomeView.js';
import ProfileView from './views/ProfileView.js';
import SocialView from './views/SocialView.js';
import PongView from './views/PongView.js';
import LocalPongView from './views/LocalPongView.js';
import ChatView from './views/ChatView.js';
import TournamentView from './views/TournamentView.js';
import WebSocketService from './utils/Websocket.js';
import Notice from './utils/Notice.js';

const websocketService = new WebSocketService();
const notice = new Notice();
let currentView = null;


const routes = {
    '/': HomeView,
    '/profile': ProfileView,
    '/social': SocialView,
    '/localgame': LocalPongView,
    '/game': PongView,
    '/chat': ChatView,
    '/tournament': TournamentView
};
const navigateTo = async (url) => {
    console.log(`Navigating to: ${url}`);
    if (currentView instanceof ChatView) {
        currentView.leaveChatRoom();
    }
    const urlParsed = url.split('/');
    const appElement = document.getElementById('app');
    appElement.innerHTML = ''; // Clear the app element

    if (urlParsed[1] === 'game' || urlParsed[1] === 'tournament')
        appElement.style.paddingBottom = 0;
    else
        appElement.removeAttribute('style');

    history.pushState(null, null, url);
    await router();
};
const router = async () => {
    const path = window.location.pathname;
    let View = routes[path] || HomeView;
    let viewUrl = window.location.href;

    if (path.startsWith('/chat/')) {
        View = ChatView;
    } else if (path.startsWith('/game/')) {
        View = PongView;
        viewUrl = path;  
		
    } else if (path.startsWith('/tournament/')) {
		View = TournamentView;
		viewUrl = path;
	}

    // Call cleanup on the current view if it has a cleanup function
    if (currentView && typeof currentView.cleanup === 'function') {
        currentView.cleanup();
    }

    // Create a new instance of the selected view
    currentView = new View();

    // Initialize the new view based on its type
    if (currentView instanceof TournamentView) {
        await currentView.init(websocketService, '/tournament');
    } else if (currentView instanceof PongView) {
        await currentView.init(websocketService, viewUrl);  // Pass the full game URL
    } else if (currentView instanceof ChatView) {
        await currentView.init(websocketService, viewUrl);
    } else {
        await currentView.init(websocketService, viewUrl);
    }

    // Update the document title to match the current view's title
    document.title = currentView.title;
};
document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    window.csrfToken = csrfToken;

    document.body.addEventListener('click', (e) => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    window.addEventListener('popstate', router);
    router();
});

export { navigateTo };