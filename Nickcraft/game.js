// =========================================================================
// 1. SETUP ENGINE & SCENE
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background
scene.fog = new THREE.FogExp2(0x87CEEB, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(20, 40, 20);
directionalLight.castShadow = true;
scene.add(directionalLight);

// =========================================================================
// 2. MATERIALS & BLOCK CONFIGURATION
// =========================================================================
const textureLoader = new THREE.TextureLoader();

// Flat color fallback materials (Will show instantly)
const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x866043 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x808080 })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; // To track all block objects in the world
let currentSelectedType = 'grass'; // Default block to place

// =========================================================================
// 3. WORLD GENERATION
// =========================================================================
const WORLD_SIZE = 16;

function createBlock(x, y, z, type) {
    const material = materials[type] || materials.grass;
    const mesh = new THREE.Mesh(blockGeometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Attach custom data so the raycaster knows what kind of block it hit
    mesh.userData = { blockType: type };
    
    scene.add(mesh);
    activeBlocks.push(mesh);
}

function generateDefaultWorld() {
    clearCurrentWorld();
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            // Create a simple layered landscape
            createBlock(x, 0, z, 'stone');
            createBlock(x, 1, z, 'dirt');
            createBlock(x, 2, z, 'grass');
        }
    }
    // Position player above the terrain center
    camera.position.set(WORLD_SIZE / 2, 5, WORLD_SIZE / 2);
}

function clearCurrentWorld() {
    activeBlocks.forEach(block => scene.remove(block));
    activeBlocks = [];
}

// Initialize the world on start
generateDefaultWorld();

// =========================================================================
// 4. CONTROLS, POINTER LOCK & INPUTS
// =========================================================================
let isLocked = false;

// Request Pointer Lock (locks mouse cursor to center screen on click)
renderer.domElement.addEventListener('click', () => {
    if (!isLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
});

// Camera Look (Mouse movement)
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    euler.setFromQuaternion(camera.quaternion);

    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;

    // Limit looking straight up or down
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));

    camera.quaternion.setFromEuler(euler);
});

// Keyboard Movement Input
const keys = { w: false, a: false, s: false, d: false, space: false };
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
    if (e.code === 'Space') keys.space = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'Space') keys.space = false;
});

// Switch Block Types (UI Hook)
window.setBlockType = function(type) {
    currentSelectedType = type;
    console.log("Selected block type:", type);
};

// =========================================================================
// 5. BLOCK BUILDING & BREAKING (RAYCASTING)
// =========================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); // Center of the screen for crosshair

document.addEventListener('mousedown', (event) => {
    if (!isLocked) return;

    // Update raycaster pointing straight out of screen center
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (intersects.length > 0 && intersects[0].distance < 6) { // 6 blocks reach range
        const hitBlock = intersects[0].object;

        if (event.button === 0) {
            // LEFT CLICK: Break Block
            scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } 
        else if (event.button === 2) {
            // RIGHT CLICK: Place Block
            // Get normal face vector to find out which side of the block was clicked
            const normal = intersects[0].face.normal;
            
            // Calculate new block position based on face hit
            const newX = Math.round(hitBlock.position.x + normal.x);
            const newY = Math.round(hitBlock.position.y + normal.y);
            const newZ = Math