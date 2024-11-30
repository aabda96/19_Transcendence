export default class WebSocketService {
    constructor() {
        this.connections = {};
		this.messageCallbacks = {};

    }
	handleGameTermination(room) {
        if (this.connections[room]) {
            // Send termination message
            this.send(room, JSON.stringify({
                type: 'terminate_game',
                room: room
            }));

            // Clean up connection
            this.disconnect(room);
        }
    }

	connectToRoom(room, url, onConnect = null) {
        if (this.connections[room]) {
            console.log(`Already connected to ${room}`);
            // return;
        }
		console.log("Connecting to room %s", room, url);
		console.log("wss://" + window.location.host + url + '/' + room + '/');

        const socket = new WebSocket('wss://' + window.location.host + url + '/' + room + '/');
        console.log("New WS to %s created", room);

        socket.onopen = () => {
            console.log(`Connected to ${room}`);
            if (onConnect) onConnect();
        };

        socket.onclose = () => console.log(`Connection to ${room} closed`);
        socket.onerror = (error) => console.error(`Error in ${room}:`, error);

        socket.onmessage = (message) => {
            const callback = this.messageCallbacks[room];
            if (callback) {
                callback(message);
            } else {
                console.log(`Message from ${room}:`, message.data);
            }
        };
        this.connections[room] = socket;
    }

    chat_connect_to_room(room, url) { // ACTIVE FUNCTION
        if (this.connections[room]) {
            console.log(`Already connected to ${room}`);
            return;
        }

        // Creation of the websocket depending on the selected room
        const socket = new WebSocket('wss://' + window.location.host + url + '/' + room + '/');
        console.log("New WS created");
		console.log("ws connected", room, url);
        socket.onopen = () => console.log(`Connected to ${room}`);
        socket.onclose = () => console.log(`Connection to ${room} closed`);
        socket.onerror = (error) => console.error(`Error in ${room}:`, error);
        socket.onmessage = (message) => handleMessage(room, message); 

        this.connections[room] = socket;
    }

    send(name, message) {
        const socket = this.connections[name];
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        } else {
            console.error(`WebSocket ${name} is not open`);
        }
    }

    handleMessage(room, message) {
        const data = JSON.parse(message.data);

        switch (data.type) {
            case "room_closed":
                console.log(`Room ${room} has been closed.`);
                this.disconnect(room);
                delete this.connections[room];
                break;
            default:
                console.log(`Message from ${room}:`, data.message);
        }
    }

	onMessage(room, callback) {
        this.messageCallbacks[room] = callback;
    }

    disconnect(name) {
        const socket = this.connections[name];
        if (socket) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.close();
            }
            delete this.connections[name];
			delete this.messageCallbacks[name];
        }
    }
}