import * as THREE from 'three';
import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

/**
 * 1. CONFIGURATION
 */
const CONFIG = {
    SPEED: 100.0,
    JUMP_FORCE: 15.0,
    GRAVITY: 30.0,
    FRICTION: 10.0,
    PLAYER_HEIGHT: 2
};

// Global variables
let scene, camera, renderer, controls, raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const mouse = new THREE.Vector2(0, 0);
let prevTime = performance.now();

// Reusable objects
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const grassMat = new THREE.MeshLambertMaterial({ color: 0x4d7833 });
let rollOverMesh;

/**
 * 2. INITIALIZATION
 */
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = CONFIG.PLAYER_HEIGHT;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', () => instructions.style.display = 'none');
    controls.addEventListener('unlock', () => instructions.style.display = 'block');

    setupLights();
    setupWorld();
    setupHelpers();
    setupInput();

    raycaster = new THREE.Raycaster();
    animate();
}

/**
 * 3. SETUP FUNCTIONS
 */
function setupLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040));
}

function setupWorld() {
    for (let x = -10; x < 10; x++) {
        for (let z = -10; z < 10; z++) {
            const block = new THREE.Mesh(boxGeo, grassMat);
            block.position.set(x, 0, z);
            scene.add(block);
        }
    }
}

function setupHelpers() {
    const rollOverGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const rollOverMat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
    rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMat);
    scene.add(rollOverMesh);
}

function setupInput() {
    document.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyD': moveRight = true; break;
            case 'Space': if (canJump) velocity.y += CONFIG.JUMP_FORCE; canJump = false; break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyD': moveRight = false; break;
        }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('mousedown', (e) => {
        if (!controls.isLocked) return;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (e.button === 0) { // Build
                const block = new THREE.Mesh(boxGeo, grassMat);
                block.position.copy(intersect.object.position).add(intersect.face.normal);
                scene.add(block);
            } else if (e.button === 2) { // Destroy
                if (intersect.object !== rollOverMesh && intersect.object.position.y > 0) {
                    scene.remove(intersect.object);
                }
            }
        }
    });
}

/**
 * 4. THE GAME LOOP
 */
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();

    if (controls.isLocked) {
        const delta = (time - prevTime) / 1000;

        // Apply friction/damping
        velocity.x -= velocity.x * CONFIG.FRICTION * delta;
        velocity.z -= velocity.z * CONFIG.FRICTION * delta;
        velocity.y -= CONFIG.GRAVITY * delta; // Gravity is always pulling down

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * CONFIG.SPEED * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * CONFIG.SPEED * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // Simple Ground Collision for Y axis
        camera.position.y += (velocity.y * delta);
        if (camera.position.y < CONFIG.PLAYER_HEIGHT) {
            velocity.y = 0;
            camera.position.y = CONFIG.PLAYER_HEIGHT;
            canJump = true;
        }

        // Update Ghost Preview
        updatePreview();
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function updatePreview() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (intersect.object !== rollOverMesh) {
            rollOverMesh.position.copy(intersect.object.position).add(intersect.face.normal);
            rollOverMesh.visible = true;
        }
    } else {
        rollOverMesh.visible = false;
    }
}

init();