// =========================================================================
// 0. PROCEDURAL TEXTURE & AUDIO ENGINE
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

// Generates a 16x16 block texture using canvas math code
function createVoxelTexture(baseColor, noiseColor, style) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 16, 16);
    
    ctx.fillStyle = noiseColor;
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
            if (style === 'wood' && i % 4 === 0) {
                // Vertical rings lines for wood grain texture
                ctx.fillRect(i, j, 1, 1);
            } else if (Math.random() > 0.6) {
                // Standard noise speckles for grass/stone/dirt
                ctx.fillRect(i, j, 1, 1);
            }
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Sharp classic pixelated texture lookup
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

// =========================================================================
// 1. ENGINE SETUP & WORLD CONSTANTS
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02); 

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
// 2. MATERIALS SETUP (GENERATING TEXTURES)
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f', 'noise') }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c', 'noise') }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252', 'noise') }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c', 'wood') }), // Beautiful procedural Light Orange Wood Grain
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
// 3. GENERATION LAYOUT (TREES & LOGO SIGN)
// =========================================================================
function spawnTree(trunkX, trunkZ) {
    const baseY = 3; 
    for (let h = 0; h < 4; h++) {
        createBlock(trunkX, baseY + h, trunkZ, 'wood'); // Spawns wood block properly
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
// 4. MOBILE INVERTED LOOK & TOUCH HANDLERS
// =========================================================================
const keys = { w: false };
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTouchX = 0, lastTouchY = 0;

document.addEventListener('touchstart', (e) => {
    initAudio(); 
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

    const lookSpeed = 0.006;
    euler.setFromQuaternion(camera.quaternion);
    
    // --- LOOK AXIS SETTINGS ---
    euler.y += deltaX * lookSpeed; 
    euler.x += deltaY * lookSpeed; // Fully inverted up/down camera tracking line!
    
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}, { passive: true });

const movePad = document.getElementById('move-pad');
movePad.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); keys.w = true; });
movePad.addEventListener('touchend', () => { keys.w = false; });

window.setBlockType = function(type) { 
    currentSelectedType = type; 
    playSound('ui'); 
};

// =========================================================================
// 5. BLOCK ACTION PLACEMENT HANDLERS
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
            const newX = Math.round(hitBlock.position.x + normal.x);
            const newY = Math.round(hitBlock.position.y + normal.y);
            const newZ = Math.round(hitBlock.position.z + normal.z);
            
            // CRITICAL FIX: Explicitly passes currentSelectedType variable here
            createBlock(newX, newY, newZ, currentSelectedType);
        }
    }
}

document.getElementById('mb-break').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-place').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });

// =========================================================================
// 6. SAVE SYSTEM
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
// 7. LOOP
// =========================================================================
const SPEED = 0.12; 

function animate() {
    requestAnimationFrame(animate);
    if (keys.w) {
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