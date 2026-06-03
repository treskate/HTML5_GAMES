// =========================================================================
// 0. TEXTURE & AUDIO GENERATOR
// =========================================================================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'break') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'place') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'ui') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, now);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
    }
}

function createVoxelTexture(baseColor, noiseColor, style) {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = noiseColor;
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
            if (style === 'wood' && i % 4 === 0) {
                ctx.fillRect(i, j, 1, 1);
            } else if (Math.random() > 0.6) {
                ctx.fillRect(i, j, 1, 1);
            }
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

// =========================================================================
// 1. ENGINE SETUP
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0x02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(40, 60, 20);
directionalLight.castShadow = true;
scene.add(directionalLight);

// =========================================================================
// 2. MATERIALS
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f', 'noise') }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c', 'noise') }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252', 'noise') }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c', 'wood') }), 
    leaves: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#166534', '#14532d', 'noise') }),
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
// 3. LOGO & TREES
// =========================================================================
function spawnTree(trunkX, trunkZ) {
    const baseY = 3; 
    for (let h = 0; h < 4; h++) createBlock(trunkX, baseY + h, trunkZ, 'wood');
    const leafHeight = baseY + 3;
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves');
            createBlock(trunkX + lx, leafHeight + 1, trunkZ + lz, 'leaves');
        }
    }
    createBlock(trunkX, leafHeight + 2, trunkZ, 'leaves');
}

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
// 4. NATURAL UN-INVERTED TOUCH & CLICK LOOK ENGINE
// =========================================================================
let isMovingForward = false;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0;
let isDraggingCamera = false;

// Unified tracking function handles finger drops and desktop mouse clicks
function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    initAudio();
    isDraggingCamera = true;
    const coords = getEventCoords(e);
    lastTrackX = coords.x;
    lastTrackY = coords.y;
}

function moveTracking(e) {
    if (!isDraggingCamera) return;
    const coords = getEventCoords(e);
    const deltaX = coords.x - lastTrackX;
    const deltaY = coords.y - lastTrackY;
    
    lastTrackX = coords.x;
    lastTrackY = coords.y;

    const lookSpeed = 0.005;
    euler.setFromQuaternion(camera.quaternion);
    
    // NATURAL TRACKING PATHWAY: Drag left -> Look Left. Drag Up -> Look Up.
    euler.y -= deltaX * lookSpeed; 
    euler.x -= deltaY * lookSpeed; 
    
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}

function stopTracking() {
    isDraggingCamera = false;
}

// Add Mobile Touch Listeners
document.addEventListener('touchstart', startTracking, { passive: true });
document.addEventListener('touchmove', moveTracking, { passive: true });
document.addEventListener('touchend', stopTracking);

// Add Desktop Mouse Click-Drag Listeners
document.addEventListener('mousedown', startTracking);
document.addEventListener('mousemove', moveTracking);
document.addEventListener('mouseup', stopTracking);

// Unified Button Events (Works for Touch and Mouse Click on Desktop)
const movePad = document.getElementById('move-pad');
function startMoving(e) { e.preventDefault(); initAudio(); isMovingForward = true; }
function stopMoving() { isMovingForward = false; }

movePad.addEventListener('touchstart', startMoving);
movePad.addEventListener('touchend', stopMoving);
movePad.addEventListener('mousedown', startMoving);
movePad.addEventListener('mouseup', stopMoving);
movePad.addEventListener('mouseleave', stopMoving);

window.setBlockType = function(type) { 
    currentSelectedType = type; 
    playSound('ui'); 
};

// =========================================================================
// 5. UNIFIED ACTION PADS
// =========================================================================
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (intersects.length > 0 && intersects[0].distance < 10) { 
        const hitBlock = intersects[0].object;
        if (!isPlacement) {
            playSound('break'); 
            scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } else {
            playSound('place'); 
            const normal = intersects[0].face.normal;
            createBlock(
                Math.round(hitBlock.position.x + normal.x),
                Math.round(hitBlock.position.y + normal.y),
                Math.round(hitBlock.position.z + normal.z),
                currentSelectedType
            );
        }
    }
}

// Connect layout element listeners across click/touch definitions
const btnBreak = document.getElementById('mb-break');
const btnPlace = document.getElementById('mb-place');

btnBreak.addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
btnBreak.addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(false); });

btnPlace.addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });
btnPlace.addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(true); });

window.addEventListener('contextmenu', e => e.preventDefault());

// =========================================================================
// 6. STORAGE MANAGERS
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
// 7. RENDERING PIPELINE LOOP
// =========================================================================
const SPEED = 0.12; 

function animate() {
    requestAnimationFrame(animate);
    if (isMovingForward) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        forward.y = 0; forward.normalize();
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