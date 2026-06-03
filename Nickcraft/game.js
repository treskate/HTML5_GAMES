// =========================================================================
// 1. SCENE SETUP & ENGINE
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(20, 40, 20);
directionalLight.castShadow = true;
scene.add(directionalLight);

// =========================================================================
// 2. CONFIG & MATERIALS
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x866043 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x808080 }),
    logo: new THREE.MeshStandardMaterial({ color: 0xd946ef }) // Bright magenta for the sign
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; 
let currentSelectedType = 'grass'; 
const WORLD_SIZE = 16;

function createBlock(x, y, z, type) {
    const material = materials[type] || materials.grass;
    const mesh = new THREE.Mesh(blockGeometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { blockType: type };
    scene.add(mesh);
    activeBlocks.push(mesh);
}

function clearCurrentWorld() {
    activeBlocks.forEach(block => scene.remove(block));
    activeBlocks = [];
}

// =========================================================================
// 3. RETRO "NICK" GIANT SIGN GENERATOR
// =========================================================================
// Grid blueprint maps to spell out N-I-C-K
const signMatrix = [
    [1,0,0,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,0,0,1],
    [1,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,1,0],
    [1,0,1,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,1,0,0],
    [1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,1,0],
    [1,0,0,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,0,0,1]
];

function buildNickSign() {
    const startX = -3;
    const startY = 8; // Floating in the air
    const zPos = 4;   // Positioned along the grid edge
    
    for (let row = 0; row < signMatrix.length; row++) {
        for (let col = 0; col < signMatrix[row].length; col++) {
            if (signMatrix[row][col] === 1) {
                // Invert row index so it builds from bottom up
                const blockY = startY + (signMatrix.length - 1 - row);
                createBlock(startX + col, blockY, zPos, 'logo');
            }
        }
    }
}

function generateDefaultWorld() {
    clearCurrentWorld();
    // Build ground
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            createBlock(x, 0, z, 'stone');
            createBlock(x, 1, z, 'dirt');
            createBlock(x, 2, z, 'grass');
        }
    }
    // Build floating logo sign
    buildNickSign();
    camera.position.set(WORLD_SIZE / 2, 5, WORLD_SIZE + 2);
}

generateDefaultWorld();

// =========================================================================
// 4. DESKTOP & MOBILE COMPATIBLE INPUT CONTROLS
// =========================================================================
let isLocked = false;
const keys = { w: false, a: false, s: false, d: false };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

// Detect if user is on mobile/iPhone
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

if (isMobile) {
    // Show visual mobile pads on screen
    document.getElementById('move-pad').style.display = 'flex';
    document.getElementById('action-pad').style.display = 'flex';
}

// --- DESKTOP POINTER LOCK ---
renderer.domElement.addEventListener('click', () => {
    if (!isMobile && !isLocked) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
});

// --- CAMERA ROTATION (Desktop Mouse + Mobile Touch Swipe) ---
let lastTouchX = 0, lastTouchY = 0;

document.addEventListener('mousemove', (event) => {
    if (isMobile || !isLocked) return;
    updateRotation(event.movementX * -0.002, event.movementY * -0.002);
});

document.addEventListener('touchstart', (e) => {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    const deltaX = e.touches[0].clientX - lastTouchX;
    const deltaY = e.touches[0].clientY - lastTouchY;
    
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;

    updateRotation(deltaX * 0.005, deltaY * 0.005);
}, { passive: true });

function updateRotation(xAmount, yAmount) {
    euler.setFromQuaternion(camera.quaternion);
    euler.y += xAmount;
    euler.x += yAmount;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}

// --- DESKTOP KEYBOARD INPUTS ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
});

// --- MOBILE VIRTUAL JOYSTICK INPUTS ---
const movePad = document.getElementById('move-pad');
movePad.addEventListener('touchstart', () => { keys.w = true; }, { passive: true });
movePad.addEventListener('touchend', () => { keys.w = false; });

window.setBlockType = function(type) { currentSelectedType = type; };

// =========================================================================
// 5. BLOCK ACTION LOGIC (BREAK / PLACE)
// =========================================================================
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (intersects.length > 0 && intersects[0].distance < 8) {
        const hitBlock = intersects[0].object;
        
        if (!isPlacement) {
            // Break
            scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } else {
            // Place
            const normal = intersects[0].face.normal;
            const newX = Math.round(hitBlock.position.x + normal.x);
            const newY = Math.round(hitBlock.position.y + normal.y);
            const newZ = Math.round(hitBlock.position.z + normal.z);
            createBlock(newX, newY, newZ, currentSelectedType);
        }
    }
}

// Mouse Triggers (Desktop)
document.addEventListener('mousedown', (e) => {
    if (isMobile || !isLocked) return;
    handleBlockAction(e.button === 2);
});
window.addEventListener('contextmenu', e => e.preventDefault());

// Button Triggers (Mobile)
document.getElementById('mb-break').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-place').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });

// =========================================================================
// 6. SAVE & LOAD
// =========================================================================
window.saveWorld = function() {
    const saveData = activeBlocks.map(block => ({
        x: block.position.x, y: block.position.y, z: block.position.z, type: block.userData.blockType
    }));
    localStorage.setItem('nickcraft_mobile_save', JSON.stringify(saveData));
    alert('World Saved!');
};

window.loadWorld = function() {
    const savedData = localStorage.getItem('nickcraft_mobile_save');
    if (!savedData) return alert('No save found!');
    clearCurrentWorld();
    JSON.parse(savedData).forEach(b => createBlock(b.x, b.y, b.z, b.type));
    alert('World Loaded!');
};

// =========================================================================
// 7. PHYSICS FRAME LOOP
// =========================================================================
const SPEED = 0.08;

function animate() {
    requestAnimationFrame(animate);

    // Direction calculation
    const changeX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const changeZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();

    camera.position.addScaledVector(forward, changeZ * SPEED);
    camera.position.addScaledVector(right, changeX * SPEED);

    // Lock camera height to standard walking plane
    camera.position.y = 4.5;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();