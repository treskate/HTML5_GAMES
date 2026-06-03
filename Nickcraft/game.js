// =========================================================================
// 0. PROCEDURAL SOUND ENGINE (WEB AUDIO API)
// =========================================================================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    initAudio(); // Initialize audio context on first user touch
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'break') {
        // Bass explosion/crunch sound for breaking blocks
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } 
    else if (type === 'place') {
        // Higher pitched pop sound for placing blocks
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } 
    else if (type === 'ui') {
        // High click sound when clicking menu hotbar buttons
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
    }
}

// =========================================================================
// 1. ENGINE SETUP
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.55);
directionalLight.position.set(40, 60, 20);
directionalLight.castShadow = true;
scene.add(directionalLight);

// =========================================================================
// 2. MATERIALS
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x866043 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x737373 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x78350f }),   
    leaves: new THREE.MeshStandardMaterial({ color: 0x166534 }), 
    logo: new THREE.MeshStandardMaterial({ color: 0xd946ef })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; 
let currentSelectedType = 'grass'; 
const WORLD_SIZE = 32;

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
// 3. TREE GENERATOR
// =========================================================================
function spawnTree(trunkX, trunkZ) {
    const baseY = 3; 
    
    for (let h = 0; h < 4; h++) {
        createBlock(trunkX, baseY + h, trunkZ, 'wood');
    }
    
    const leafHeight = baseY + 3;
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves');
            createBlock(trunkX + lx, leafHeight + 1, trunkZ + lz, 'leaves');
        }
    }
    createBlock(trunkX, leafHeight + 2, trunkZ, 'leaves');
}

// =========================================================================
// 4. WORLD GENERATOR
// =========================================================================
const signMatrix = [
    [1,0,0,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,0,0,1],
    [1,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,1,0],
    [1,0,1,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,1,0,0],
    [1,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,1,0],
    [1,0,0,1,0,0,1,1,1,1,0,0,1,1,1,1,0,0,1,0,0,1]
];

function buildNickSign() {
    const startX = (WORLD_SIZE / 2) - 11;
    const startY = 10; 
    const zPos = 8;   
    
    for (let row = 0; row < signMatrix.length; row++) {
        for (let col = 0; col < signMatrix[row].length; col++) {
            if (signMatrix[row][col] === 1) {
                const blockY = startY + (signMatrix.length - 1 - row);
                createBlock(startX + col, blockY, zPos, 'logo');
            }
        }
    }
}

function generateDefaultWorld() {
    clearCurrentWorld();
    
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            createBlock(x, 0, z, 'stone');
            createBlock(x, 1, z, 'dirt');
            createBlock(x, 2, z, 'grass');
        }
    }
    
    buildNickSign();
    spawnTree(8, 20);
    spawnTree(24, 22);

    camera.position.set(WORLD_SIZE / 2, 5, WORLD_SIZE - 2);
}

generateDefaultWorld();

// =========================================================================
// 5. INVERTED TOUCH CAMERA SWIPING & MOVEMENT
// =========================================================================
const keys = { w: false };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTouchX = 0, lastTouchY = 0;

document.addEventListener('touchstart', (e) => {
    initAudio(); // iOS requirement: activate sounds on user touch
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

    const lookSpeed = 0.005;
    euler.setFromQuaternion(camera.quaternion);
    euler.y += deltaX * lookSpeed; 
    euler.x -= deltaY * lookSpeed; // Inverted Y-Axis
    
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}, { passive: true });

const movePad = document.getElementById('move-pad');
movePad.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); keys.w = true; });
movePad.addEventListener('touchend', () => { keys.w = false; });

window.setBlockType = function(type) { 
    currentSelectedType = type; 
    playSound('ui'); // Play click sound
};

// =========================================================================
// 6. BLOCK MANIPULATION WITH SOUND FX
// =========================================================================
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (intersects.length > 0 && intersects[0].distance < 10) { 
        const hitBlock = intersects[0].object;
        
        if (!isPlacement) {
            // Break block
            playSound('break'); // Play audio crunch
            scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } else {
            // Place block
            playSound('place'); // Play audio pop
            const normal = intersects[0].face.normal;
            const newX = Math.round(hitBlock.position.x + normal.x);
            const newY = Math.round(hitBlock.position.y + normal.y);
            const newZ = Math.round(hitBlock.position.z + normal.z);
            createBlock(newX, newY, newZ, currentSelectedType);
        }
    }
}

document.getElementById('mb-break').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-place').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });

// =========================================================================
// 7. SAVE / LOAD
// =========================================================================
window.saveWorld = function() {
    playSound('ui');
    const saveData = activeBlocks.map(block => ({
        x: block.position.x, y: block.position.y, z: block.position.z, type: block.userData.blockType
    }));
    localStorage.setItem('nickcraft_mobile_save', JSON.stringify(saveData));
    alert('World Saved!');
};

window.loadWorld = function() {
    playSound('ui');
    const savedData = localStorage.getItem('nickcraft_mobile_save');
    if (!savedData) return alert('No save found!');
    clearCurrentWorld();
    JSON.parse(savedData).forEach(b => createBlock(b.x, b.y, b.z, b.type));
    alert('World Loaded!');
};

// =========================================================================
// 8. FRAME ANIMATION LOOP
// =========================================================================
const SPEED = 0.12; 

function animate() {
    requestAnimationFrame(animate);

    if (keys.w) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; 
        forward.normalize();
        camera.position.addScaledVector(forward, SPEED);
    }

    camera.position.y = 4.5;
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();