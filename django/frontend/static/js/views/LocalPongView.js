import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export default class LocalPongView {
    constructor() {
        // Get the main app element
        this.appElement = document.getElementById('app');
        this.title = 'OfflinePong';
        // Set up scene, camera, and renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.appElement.appendChild(this.renderer.domElement); // Append to the main element

        // Game variables
        this.paddleWidth = 0.15; // Increased paddle width
        this.paddleHeight = 1; // Paddle height
        this.paddleDepth = 0.5; // Paddle depth
        this.ballSize = 0.15; // Decreased ball size
        this.maxScore = 3;
        this.gameOver = false;
        this.playersReady = false; // Track player readiness

        // Paddle movement speed
        this.paddleSpeed = 0.1;

        // Initialize scores
        this.resetScores();

        // Create boundary, paddles, and ball
        this.createBoundary();
        this.createPaddles();
        this.createBall();

        // Set camera position for top-down view
        this.camera.position.set(0, -5, -5); // Elevated view directly above
        this.camera.lookAt(0, 0, 0); // Look at the center of the scene

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Handle key presses
        this.keys = {};
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Create score display
        this.createScoreDisplay();

        // Create instruction display
        this.createInstructionDisplay();

        // Create message display
        this.createMessageDisplay();

        // Start animation
        this.animate();
    }
    init() {
    }

    createInstructionDisplay() {
        const instructionDiv = document.createElement('div');
        instructionDiv.id = 'instructionDisplay';
        instructionDiv.style.position = 'absolute';
        instructionDiv.style.top = '20%'; // Positioning above the game
        instructionDiv.style.left = '50%'; // Center horizontally
        instructionDiv.style.transform = 'translate(-50%, -50%)'; // Centering correction
        instructionDiv.style.color = 'black'; // Change text color to black
        instructionDiv.style.fontSize = '24px';
        instructionDiv.innerHTML = 'Press R to be ready';
        this.appElement.appendChild(instructionDiv); // Append to the main element
    }
    

    createPaddles() {
        const paddleGeometry = new THREE.BoxGeometry(this.paddleWidth, this.paddleHeight, this.paddleDepth);
        const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Left paddle
        this.leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.leftPaddle.position.set(-3.8, 0, 0); // Adjusted position for rectangular field
        this.scene.add(this.leftPaddle);

        // Right paddle
        this.rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.rightPaddle.position.set(3.8, 0, 0); // Adjusted position for rectangular field
        this.scene.add(this.rightPaddle);
    }

    createBall() {
        const ballGeometry = new THREE.SphereGeometry(this.ballSize, 32, 32);
        const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.position.set(0, 0, 0); // Initial position
        this.scene.add(this.ball);

        // Ball movement properties
        this.ballVelocity = new THREE.Vector3(0.06, 0.06, 0);
    }

    createBoundary() {
        // Creating a rectangular boundary for the playground
        const boundaryWidth = 8;  // Width of the rectangle
        const boundaryHeight = 4;  // Height of the rectangle
        const boundaryGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(boundaryWidth, boundaryHeight, 0));
        const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const boundary = new THREE.LineSegments(boundaryGeometry, boundaryMaterial);
        this.scene.add(boundary);
    }

    onKeyDown(event) {
        // Prevent default arrow key scrolling behavior
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
        }
    
        // Store key state
        this.keys[event.key] = true;
    
        // Player readiness
        if (event.key === 'r' && !this.playersReady) { // Change to R key
            this.playersReady = true;
            this.checkIfBothPlayersReady();
            this.hideInstructionMessage(); // Hide the instruction message
        }
    }
    
    hideInstructionMessage() {
        const instructionDisplay = document.getElementById('instructionDisplay');
        if (instructionDisplay) {
            instructionDisplay.style.display = 'none'; // Hide the instruction message
        }
    }
    

    onKeyUp(event) {
        // Reset key state
        this.keys[event.key] = false;
    }

    checkIfBothPlayersReady() {
        if (this.playersReady) {
            // Hide instruction display when both players are ready
            document.getElementById('instructionDisplay').style.display = 'none';
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate()); // Store the animation frame ID
    
        if (!this.gameOver && this.playersReady) {
            this.update();
        }
        this.renderer.setClearColor(0xffffff);
    
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    
        // Display score and update the game
        this.displayScore();
        this.movePaddles();
    }
    

    movePaddles() {
        // Move right paddle (now using W and S keys)
        if (this.keys['w']) {
            this.rightPaddle.position.y += this.paddleSpeed;  // Right paddle moves up with W
            if (this.rightPaddle.position.y > 1.5) this.rightPaddle.position.y = 1.5; // Updated boundary limit
        }
        if (this.keys['s']) {
            this.rightPaddle.position.y -= this.paddleSpeed;  // Right paddle moves down with S
            if (this.rightPaddle.position.y < -1.5) this.rightPaddle.position.y = -1.5; // Updated boundary limit
        }
    
        // Move left paddle (now using arrow keys)
        if (this.keys['ArrowUp']) {
            this.leftPaddle.position.y += this.paddleSpeed;  // Left paddle moves up with ArrowUp
            if (this.leftPaddle.position.y > 1.5) this.leftPaddle.position.y = 1.5; // Updated boundary limit
        }
        if (this.keys['ArrowDown']) {
            this.leftPaddle.position.y -= this.paddleSpeed;  // Left paddle moves down with ArrowDown
            if (this.leftPaddle.position.y < -1.5) this.leftPaddle.position.y = -1.5; // Updated boundary limit
        }
    }
    

    update() {
        // Update ball position
        this.ball.position.add(this.ballVelocity);
    
        // Ball collision with walls
        if (this.ball.position.y > 2 || this.ball.position.y < -2) {
            this.ballVelocity.y = -this.ballVelocity.y;
        }
    
        // Ball collision with paddles
        if (this.ball.position.x < -3.8 && this.ball.position.x > -3.9 
            && this.ball.position.y < this.leftPaddle.position.y + this.paddleHeight / 2 
            && this.ball.position.y > this.leftPaddle.position.y - this.paddleHeight / 2) {
            this.ballVelocity.x = -this.ballVelocity.x;
        } else if (this.ball.position.x > 3.8 && this.ball.position.x < 3.9 
            && this.ball.position.y < this.rightPaddle.position.y + this.paddleHeight / 2 
            && this.ball.position.y > this.rightPaddle.position.y - this.paddleHeight / 2) {
            this.ballVelocity.x = -this.ballVelocity.x;
        }
    
        // Reset ball if it goes out of bounds and update score
        if (this.ball.position.x > 4) {
            this.rightScore++;  // Swap to right score when ball goes out left
            this.resetBall();
        } else if (this.ball.position.x < -4) {
            this.leftScore++;  // Swap to left score when ball goes out right
            this.resetBall();
        }
    
        // Check for game over
        if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
            this.gameOver = true;
            this.updateMessage(`Game Over! ${this.leftScore >= this.maxScore ? 'Left Player' : 'Right Player'} wins!`);
            this.createRestartButton(); // Show restart button when game over
        }
    }
    

	resetBall() {
		this.ball.position.set(0, 0, 0);
		const angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
		const direction = Math.random() < 0.5 ? 1 : -1;
		const speed = 0.06;
		this.ballVelocity.set(speed * Math.cos(angle) * direction, speed * Math.sin(angle), 0);
	}

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    createScoreDisplay() {
        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'scoreDisplay';
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '30%'; // Adjust this value if needed, but not too high to overlap navbar
        scoreDiv.style.left = '50%'; // Center horizontally
        scoreDiv.style.transform = 'translate(-50%, -50%)'; // Centering correction
        scoreDiv.style.color = 'black'; // Change text color to black
        scoreDiv.style.fontSize = '24px';
        this.appElement.appendChild(scoreDiv); // Append to the main element
    }

    displayScore() {
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) { // Check if the scoreDisplay element exists
            scoreDisplay.innerHTML = ` ${this.leftScore} | ${this.rightScore}`;
        }
    }
    

    createMessageDisplay() {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'messageDisplay';
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%'; // Center vertically
        messageDiv.style.left = '50%'; // Center horizontally
        messageDiv.style.transform = 'translate(-50%, -50%)'; // Centering correction
        messageDiv.style.color = 'white';
        messageDiv.style.fontSize = '24px';
        this.appElement.appendChild(messageDiv); // Append to the main element
    }

    updateMessage(message) {
        const messageDisplay = document.getElementById('messageDisplay');
        messageDisplay.innerHTML = message;
        messageDisplay.style.color = 'black'; // Ensures Game Over message is also black
    }

    cleanup() {
        // Stop animation loop
        cancelAnimationFrame(this.animationFrameId); // Ensure this is properly set in animate
    
        // Dispose of Three.js objects to free up memory
        this.scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
            }
        });
    
        // Remove the renderer's DOM element
        if (this.renderer.domElement) {
            this.renderer.domElement.remove();
        }
    
        // Clean up any other DOM elements added
        const scoreDisplay = document.getElementById('scoreDisplay');
        if (scoreDisplay) scoreDisplay.remove();
    
        const instructionDisplay = document.getElementById('instructionDisplay');
        if (instructionDisplay) instructionDisplay.remove();
    
        const messageDisplay = document.getElementById('messageDisplay');
        if (messageDisplay) messageDisplay.remove();
    }
    
    
    createRestartButton() {
        // Check if a restart button already exists and remove it if needed
        const existingButton = document.querySelector('button');
        if (existingButton) {
            existingButton.remove(); // Remove any existing restart button to avoid duplicates
        }
    
        // Create a new restart button
        const restartButton = document.createElement('button');
        restartButton.innerHTML = 'Restart Game';
        restartButton.style.position = 'absolute';
        restartButton.style.top = '60%'; // Position below the message
        restartButton.style.left = '50%'; // Center horizontally
        restartButton.style.transform = 'translate(-50%, -50%)'; // Centering correction
        restartButton.style.fontSize = '24px';
        restartButton.style.padding = '10px';
        restartButton.style.backgroundColor = 'white';
        restartButton.style.color = 'black';
        
        // Attach the event listener to restart the game
        restartButton.onclick = () => this.restartGame(); // Restart game when clicked
    
        // Append the new restart button to the app element
        this.appElement.appendChild(restartButton);
    }
    

    restartGame() {
        // Reset scores and game state
        this.leftScore = 0;
        this.rightScore = 0;
        this.gameOver = false;
        this.playersReady = false;
    
        // Reset ball position and velocity
        this.resetBall();
    
        // Reset the score display
        this.displayScore();
    
        // Update the game message to be empty
        this.updateMessage('');
    
        // Show instructions again
        const instructionDisplay = document.getElementById('instructionDisplay');
        if (instructionDisplay) {
            instructionDisplay.style.display = 'block';
        }
    
        // Remove the restart button if it exists
        const restartButton = document.querySelector('button');
        if (restartButton) {
            restartButton.remove(); // Ensure button is fully removed
        }
    }
    

    resetScores() {
        this.leftScore = 0;
        this.rightScore = 0;
    }
    
}
