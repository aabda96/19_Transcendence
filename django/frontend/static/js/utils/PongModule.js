import * as THREE from '../three/three.module.js';
import { OrbitControls } from '../three/jsm/controls/OrbitControls.js';
import { FontLoader } from '../three/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../three/jsm/geometries/TextGeometry.js'
import { Request } from './Request.js';
import { navigateTo } from '../index.js';

const fontLoader = new FontLoader();

class CountdownText {
    constructor(scene, config = {}) {
      this.scene = scene;
      this.currentNumber = 3;
      this.numberMesh = null;
      this.isAnimating = true;

      const {
        position = { x: 0, y: 0, z: -10 },
        rotation = { x: 0, y: 0, z: 0 },
      } = config;

      this.position = position;
      this.rotation = rotation;
      this.rotationDir = config.rotationDir;

      fontLoader.load('/static/js/three/jsm/fonts/Roboto_Bold.json', (font) => {
        this.font = font;
        this.showNumber();
      });
    }

    createTextGeometry(text) {
      const geometry = new TextGeometry(text, {
        font: this.font,
        size: 5,
        depth: 2,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.05,
        bevelSegments: 5
      });
      
      geometry.computeBoundingBox();
      geometry.center();
      
      return geometry;
    }

    showNumber() {
      if (this.numberMesh) {
        this.scene.remove(this.numberMesh);
      }
      
      let text = this.currentNumber > 0 ? this.currentNumber.toString() : 'START!';
      const material = new THREE.MeshPhongMaterial({
        color: this.currentNumber > 0 ? 0xffffff : 0x00ff00,
        emissive: this.currentNumber > 0 ? 0x444444 : 0x00aa00
      });

      const geometry = this.createTextGeometry(text);
      this.numberMesh = new THREE.Mesh(geometry, material);
      this.numberMesh.scale.set(10, 10, 10);
      this.numberMesh.position.set(this.position.x, this.position.y, this.position.z);
      this.numberMesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

      this.scene.add(this.numberMesh);

      const targetScale = 1;
      const scaleUp = () => {
        if (this.numberMesh.scale.x < targetScale) {
          this.numberMesh.scale.multiplyScalar(1.1);
          requestAnimationFrame(scaleUp);
        } else {
          setTimeout(() => {
            if (this.currentNumber > 0) {
              this.currentNumber--;
              this.showNumber();
            } else {
              setTimeout(() => {
                this.fadeOut();
              }, 1000);
            }
          }, 1000);
        }
      };
      scaleUp();
    }
  
    fadeOut() {
      const fadeOut = () => {
        this.numberMesh.scale.multiplyScalar(0.9);
        this.numberMesh.position.z -= 1;
        if (this.numberMesh.scale.x > 0.1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.cleanup();
        }
      };
      fadeOut();
    }
  
    update() {
      if (!this.isAnimating) return;
  
      if (this.numberMesh) {
        this.rotationDir ? this.numberMesh.rotation.y += 0.01 : this.numberMesh.rotation.y -= 0.01;
            
      }
    }
  
    cleanup() {
      this.isAnimating = false;
      if (this.numberMesh) {
        this.scene.remove(this.numberMesh);
      }
    }
  }

class Paddle {
    constructor(scene, position, x, y) {
        this.scene = scene;

        this.geometry = new THREE.BoxGeometry(x, y, 20);
        // this.material = new THREE.MeshNormalMaterial({});

        this.blackMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            metalness: 0.9,
            roughness: 0.2
        });
        // this.blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        this.mesh = new THREE.Mesh(this.geometry, this.blackMaterial);
        this.mesh.castShadow = true;

        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }
}

class PongBall {
    constructor(scene, position, r) {
        this.scene = scene;
        this.geometry = new THREE.SphereGeometry(r);

        this.colorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000ff0,
            metalness: 0.9,
            roughness: 0.2
        });

        this.mesh = new THREE.Mesh(this.geometry, this.colorMaterial);
        this.mesh.castShadow = true;
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }
}

class ScoreObject {
    constructor(scene, config, n) {
        this.scene = scene;
        this.position = config.position;
        this.rotation = config.rotation;
        this.currentScore = n;
        this.font = null;

        fontLoader.load(
            '/static/js/three/jsm/fonts/Roboto_Bold.json',
            (font) => {
                this.font = font;
                this.createText(this.currentScore);
            }
        );
    }

    createText(score) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.textGeometry.dispose();
        }

        this.textGeometry = new TextGeometry(
            score.toString(),
            {
                font: this.font,
                size: 40,
                depth: 2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.02,
                bevelOffset: 0,
                bevelSegments: 5
            }
        );
        if (!this.scoreMaterial) {
            // this.scoreMaterial = new THREE.MeshStandardMaterial({
            //     color: 0x000000,
            //     metalness: 0.9,
            //     roughness: 0.2
            // });
            this.scoreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        }

        this.mesh = new THREE.Mesh(this.textGeometry, this.scoreMaterial);
        this.mesh.castShadow = true;

        this.textGeometry.center();
        this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    updateScore(score) {
        this.currentScore = score;
        if (this.font) {
            this.createText(score);
        }
    }
}

class NameObject {
    constructor(scene, config, n, side) {
        this.scene = scene;
        this.textGeometry = null;
        this.position = config.position;
        this.rotation = config.rotation;

        fontLoader.load(
            '/static/js/three/jsm/fonts/Roboto_Bold.json',
            (font) => {
                this.textGeometry = new TextGeometry(
                    n,
                    {
                        font: font,
                        size: 12,
                        depth: 1,
                        curveSegments: 12,
                        bevelEnabled: true,
                        bevelThickness: 0.03,
                        bevelSize: 0.02,
                        bevelOffset: 0,
                        bevelSegments: 5
                    }
                );

                this.textGeometry.computeBoundingBox();
                const boundingBox = this.textGeometry.boundingBox;

                if (side === 'left') {
                    const rightAlign = new THREE.Vector3();
                    rightAlign.x = -boundingBox.max.x;
                    rightAlign.y = -(boundingBox.max.y - boundingBox.min.y) / 2;
                    rightAlign.z = -(boundingBox.max.z - boundingBox.min.z) / 2;
                    
                    this.textGeometry.translate(rightAlign.x, rightAlign.y, rightAlign.z);
                } else if (side === 'right') {
                    const leftAlign = new THREE.Vector3();
                    leftAlign.x = -boundingBox.min.x;
                    leftAlign.y = -(boundingBox.max.y - boundingBox.min.y) / 2;
                    leftAlign.z = -(boundingBox.max.z - boundingBox.min.z) / 2;
                    
                    this.textGeometry.translate(leftAlign.x, leftAlign.y, leftAlign.z);
                }

                this.textMaterial = new THREE.MeshBasicMaterial({ color: 0x4f4f4f });
                // this.textMaterial = new THREE.MeshNormalMaterial({ wireframe: true });
                this.mesh = new THREE.Mesh(this.textGeometry, this.textMaterial);

                this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
                this.mesh.position.copy(this.position);
                this.mesh.castShadow = true;
                scene.add(this.mesh);
            }
        );
    }
}

export default class PongGame {
    constructor(ws, url) {
        this.players = null;
        this.me = null;
        this.mainPov = null;

        this.paddle1 = null;
        this.paddle2 = null;
        this.score1 = null;
        this.score2 = null;
        this.ball = null;
        this.scoreName1 = null;
        this.websocketService = ws;
        this.roomName = null;
        this.url = url;
        this.animID = null;
        this.scene = null;
        this.renderer = null;
        this.particleSystem = null;

        this.throttledMove = this.throttled(this.movePaddle.bind(this), 65);
    }

    throttled(func, limit) {
        let inThrottled;
        return function(...args) {
            if (!inThrottled) {
                func.apply(this, args);
                inThrottled = true;
                setTimeout(() => inThrottled = false, limit);
            }
        }
    }

    async startPongGame() {

        if (!this.roomName) {
			const urlParts = this.url.split('/');	
            this.roomName = urlParts[urlParts.length - 1];
			this.url = "/game"
        }
        this.me = await getUsername();
        this.websocketService.connectToRoom(this.roomName, this.url);
            
        this.websocketService.connections[this.roomName].onmessage = async (e) => {
            const data = JSON.parse(e.data);
            
            switch (data.type) {
                case "move_ball":
                    this.ball.mesh.position.x = data.ball_position.x - 400;
                    this.ball.mesh.position.y = data.ball_position.y - 200;
                    const [leftPaddle, rightPaddle] = data.paddle_positions;
                    this.paddle1.mesh.position.y = leftPaddle.y - 150;
                    this.paddle2.mesh.position.y = rightPaddle.y - 150;
                    break;

                case "score":
                    let score = JSON.parse(data.scores);
                    this.score1.updateScore(score.player1);
                    this.score2.updateScore(score.player2);
                    break;

                case "win_game":
                    const   winnerElem = document.getElementById('winnerInfo');
                    const   gameContainerElem = document.getElementById('gameContainer');
                    const   url = window.location.href.split('/');

                    if (gameContainerElem)
                        gameContainerElem.remove();
                    if (url[3] === 'game') {
                        document.querySelector('article').style.display = 'block';
                        if (this.me === data.winner) {
                            winnerElem.classList.add('win');
                            winnerElem.innerHTML = `
                                <div class="winnerInfoContainer">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" width="32" height="32"><path d="M400 0L176 0c-26.5 0-48.1 21.8-47.1 48.2c.2 5.3 .4 10.6 .7 15.8L24 64C10.7 64 0 74.7 0 88c0 92.6 33.5 157 78.5 200.7c44.3 43.1 98.3 64.8 138.1 75.8c23.4 6.5 39.4 26 39.4 45.6c0 20.9-17 37.9-37.9 37.9L192 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-26.1 0C337 448 320 431 320 410.1c0-19.6 15.9-39.2 39.4-45.6c39.9-11 93.9-32.7 138.2-75.8C542.5 245 576 180.6 576 88c0-13.3-10.7-24-24-24L446.4 64c.3-5.2 .5-10.4 .7-15.8C448.1 21.8 426.5 0 400 0zM48.9 112l84.4 0c9.1 90.1 29.2 150.3 51.9 190.6c-24.9-11-50.8-26.5-73.2-48.3c-32-31.1-58-76-63-142.3zM464.1 254.3c-22.4 21.8-48.3 37.3-73.2 48.3c22.7-40.3 42.8-100.5 51.9-190.6l84.4 0c-5.1 66.3-31.1 111.2-63 142.3z"/></svg>
                                    <h2>You win !</h2>
                                </div>
                            `;
                        } else {
                            winnerElem.classList.add('lose');
                            winnerElem.innerHTML = `
                                <div class="winnerInfoContainer">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="32" height="32"><path d="M352 493.4c-29.6 12-62.1 18.6-96 18.6s-66.4-6.6-96-18.6L160 288l0-16-32 0 0 16 0 189.8C51.5 433.5 0 350.8 0 256C0 114.6 114.6 0 256 0S512 114.6 512 256c0 94.8-51.5 177.5-128 221.8L384 288l0-16-32 0 0 16 0 205.4zM208 336l0 32c0 26.5 21.5 48 48 48s48-21.5 48-48l0-32c0-26.5-21.5-48-48-48s-48 21.5-48 48zm-91.2-98.4c21.6-28.8 64.8-28.8 86.4 0l25.6-19.2c-34.4-45.9-103.2-45.9-137.6 0l25.6 19.2zm278.4 0l25.6-19.2c-34.4-45.9-103.2-45.9-137.6 0l25.6 19.2c21.6-28.8 64.8-28.8 86.4 0z"/></svg>
                                    <h2>You lose !</h2>
                                </div>
                            `;
                        }
                    }
                    this.closeCanvas(this.scene, this.renderer, this.animID);
                    break;
				case "stop_game":
					this.closeCanvas(this.scene, this.renderer, this.animID);
					navigateTo("/")
					
					break;

                case "start_game":
                    const gameInfos = await getPongGameInfos(this.roomName);
                    this.setGame(this.websocketService, gameInfos);
                    if (document.getElementById('gameContainer'))
                        document.getElementById('gameContainer').style.display = 'block';
                    break;
                }
            };
    }

    setRoomName(roomName) {
        this.roomName = roomName;
    }

    async setGame(pongSocket, data) {

        // UNPACK DATA
        this.players = data.players;
        const plane_width = data.canvas_width;
        const plane_height = data.canvas_height;
        const p_w = data.paddle_width;
        const p_h = data.paddle_height;
        const ball_radius = data.ball_radius;
        const player1 = data.left_player;
        const player2 = data.right_player;
        const left_alias = data.left_alias;
        const right_alias = data.right_alias;
        let leadCamera;

        const scene = new THREE.Scene();

        scene.add(new THREE.AxesHelper());

        // CAMERAS ----------------------------------------------
        const camera1 = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera1.position.x = -550;
        camera1.position.y = 0;
        camera1.position.z = 300;
        camera1.lookAt(-200, 0, 0);

        const camera2 = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera2.position.x = 550;
        camera2.position.y = 0;
        camera2.position.z = 300;
        camera2.lookAt(200, 0, 0);

        this.mainPov = data.players[this.me].camera === 'camera1' ? "P1" : "P2";
        leadCamera = data.players[this.me].camera === 'camera1' ? camera1 : camera2;
    
        //  RENDER -----------------------------------------
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        const scale = 0.96;
        renderer.setSize(window.innerWidth, window.innerHeight * scale);
        renderer.setClearColor(0xffffff);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        //  ORBIT -----------------------------------------

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        const controls = new OrbitControls(camera, renderer.domElement);

        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.update();

        // GROUND PLANE --------------------------------------

        const planeGeometry = new THREE.PlaneGeometry(plane_width*2, plane_height*2);
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 1
         });
        // const planeMaterial = new THREE.MeshNormalMaterial({});
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.receiveShadow = true;

        scene.add(plane);

        // PADDLE --------------------------------------

        this.paddle1 = new Paddle(scene, new THREE.Vector3(-plane_width/2, 0, 10), p_w, p_h);
        this.paddle2 = new Paddle(scene, new THREE.Vector3(plane_width/2, 0, 10), p_w, p_h);

        // BALL --------------------------------------------

        this.ball = new PongBall(scene, new THREE.Vector3(0, 0, 7), ball_radius)

        // SCORE - NUMBER --------------------------------------------

        if (this.mainPov == "P1") {
            const config1 = {
                position: new THREE.Vector3(-150, 230, 1),
                rotation: {x: 0, y: 0, z: -Math.PI/2}
            }
            const config2 = {
                position: new THREE.Vector3(-150, -230, 1),
                rotation: {x: 0, y: 0, z: -Math.PI/2}
            }
            this.score1 = new ScoreObject(scene, config1, '0');
            this.score2 = new ScoreObject(scene, config2, '0');
        } else {
            const config1 = {
                position: new THREE.Vector3(150, -230, 1),
                rotation: {x: 0, y: 0, z: Math.PI/2}
            }
            const config2 = {
                position: new THREE.Vector3(150, 230, 1),
                rotation: {x: 0, y: 0, z: Math.PI/2}
            }
            this.score1 = new ScoreObject(scene, config1, '0');
            this.score2 = new ScoreObject(scene, config2, '0');
        }

        // SCORE - NAME --------------------------------------------

        if (this.mainPov == "P1") {
            const config1 = {
                position: new THREE.Vector3(-110, 210, 10),
                rotation: {x: 0, y: -Math.PI/2, z: -Math.PI/2}
            }
            const config2 = {
                position: new THREE.Vector3(-110, -210, 10),
                rotation: {x: 0, y: -Math.PI/2, z: -Math.PI/2}
            }
            this.scoreName1 = new NameObject(scene, config1, left_alias, "left");
            this.scoreName2 = new NameObject(scene, config2, right_alias, "right");
        } else {
            const config1 = {
                position: new THREE.Vector3(110, -210, 10),
                rotation: {x: 0, y: Math.PI/2, z: Math.PI/2}
            }
            const config2 = {
                position: new THREE.Vector3(110, 210, 10),
                rotation: {x: 0, y: Math.PI/2, z: Math.PI/2}
            }
            this.scoreName1 = new NameObject(scene, config1, left_alias, "left");
            this.scoreName2 = new NameObject(scene, config2, right_alias, "right");
        }

        // BORDER --------------------------------------------

        const borderGeometry = new THREE.PlaneGeometry(plane_width, plane_height);
        const edges = new THREE.EdgesGeometry(borderGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const border = new THREE.LineSegments(edges, borderMaterial);
        scene.add(border);

        // FILL LINES --------------------------------------------

        const fillLinesMaterial = new THREE.LineBasicMaterial({ color: 0xdedfe0 });
        const fillLines = new THREE.Group();
        
        const numLines = 50;
        let step = plane_width / (numLines + 1);
        
        // vertical lines
        for (let i = 1; i <= numLines; i++) {
            const x = -plane_width / 2 + i * step;
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, -plane_height / 2, 0),
                new THREE.Vector3(x, plane_height / 2, 0)
            ]);
            const line = new THREE.Line(geometry, fillLinesMaterial);
            fillLines.add(line);
        }
        
        step = plane_height / (numLines + 1);
        // horizontal lines
        for (let i = 1; i <= numLines; i++) {
            const y = -plane_height / 2 + i * step;
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-plane_width / 2, y, 0),
                new THREE.Vector3(plane_width / 2, y, 0)
            ]);
            const line = new THREE.Line(geometry, fillLinesMaterial);
            fillLines.add(line);
        }
        
        scene.add(fillLines);

        // LIGHTS --------------------------------------------

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const directionalLightMain = new THREE.DirectionalLight(0xffffff, 2);
        directionalLightMain.position.set(-300, 200, 300);
        directionalLightMain.castShadow = true;

        directionalLightMain.shadow.mapSize.width = 1024;
        directionalLightMain.shadow.mapSize.height = 1024;
        directionalLightMain.shadow.camera.near = 1;
        directionalLightMain.shadow.camera.far = 1000;
        directionalLightMain.shadow.camera.left = -500;
        directionalLightMain.shadow.camera.right = 500;
        directionalLightMain.shadow.camera.top = 500;
        directionalLightMain.shadow.camera.bottom = -500;

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight1.position.set(-300, 200, 300);
        directionalLight1.castShadow = true;

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight2.position.set(300, 200, 300);
        directionalLight2.castShadow = true;

        // scene.add(directionalLightMain);
        scene.add(directionalLightMain, directionalLight1, directionalLight2);

        // const directionalLightHelper1 = new THREE.DirectionalLightHelper(directionalLight1, 1, 0xff0000);
        // const directionalLightHelper2 = new THREE.DirectionalLightHelper(directionalLight2, 1, 0xff0000);

        // scene.add(directionalLightHelper1, directionalLightHelper2);

        // COUNTDOWN --------------------------------------------

        let countdownTextP1 = null;
        let countdownTextP2 = null;

        if (this.mainPov == "P1") {
            countdownTextP1 = new CountdownText(scene, {
                position : {x: -200, y: 0, z: 40},
                rotation : {x: 0, y: 0, z: -90 * Math.PI / 180},
                rotationDir : 0
            });
        } else {
            countdownTextP2 = new CountdownText(scene, {
                position : {x: 200, y: 0, z: 40},
                rotation : {x: 0, y: 0, z: 90 * Math.PI / 180},
                rotationDir : 1
            });
        }

        // ANIMATE --------------------------------------------

        let lastTime = 0;
        const frameInterval = 1000 / 30;
        
        function animate(currentTime) {
            const deltaTime = currentTime - lastTime;
            if (deltaTime >= frameInterval) {
                lastTime = currentTime;
                // controls.update();
                renderer.render(scene, leadCamera);
                if (countdownTextP1) countdownTextP1.update();
                else if (countdownTextP2) countdownTextP2.update();
            }
            requestAnimationFrame(animate);
        }

        camera1.rotation.z = -90 * Math.PI / 180;
        camera2.rotation.z = 90 * Math.PI / 180;

        this.scene = scene;
        this.renderer = renderer;
        animate();

        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.throttledMove('left');
                    break;
                case 'ArrowRight':
                    this.throttledMove('right');
                    break;
            }
        });
    }

    movePaddle(direction) {
        const index = this.players[this.me].index;
        postPaddlePos(this.roomName, direction, index);
    }

    closeCanvas(scene, renderer, animID) {
        cancelAnimationFrame(animID);
        
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        if (document.body.contains(renderer.domElement)) {
            document.body.removeChild(renderer.domElement);
        }

        while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
        }
        renderer.dispose();
        console.log("three.js canvas clean and removed");
      }
}

async function postPaddlePos(roomName, direction, index) {
    try {
        const response = await fetch(`/api/game/${roomName}/update/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCookie('csrftoken'),
            },
            body: JSON.stringify({
                direction: direction,
                player_id: index,
            })
        });
    } catch (error) {
        console.error('Error updating game state:', error);
    }
}

async function getPongGameInfos(roomName) {

    try {
        const response = await fetch(`/api/game/${roomName}/get_pong/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCookie('csrftoken'),
            },
        });
        return (response.json());
    } catch (error) {
        console.error('Error getting game state:', error);
    }
}

async function getCookie(name) {
    
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();

            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function getUsername() {
    const data = await Request('GET', '/api/profiles/me');
    return data.username;
}
