// =========================================================================
// 0. PROCEDURAL SOUND & TEXTURE SYSTEMS
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
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'place') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'jump1') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'jump2') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
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
// 1. ENGINE INITIALIZATION
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015); // Adjust visibility for 48x48 layout

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(60, 80, 40);
directionalLight.castShadow = true;
scene.add(directionalLight);

// =========================================================================
// 2. MATERIALS SETUP
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f', 'noise') }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c', 'noise') }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252', 'noise') }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c', 'wood') }), 
    leaves: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#166534', '#14532d', 'noise') }),
    water: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.1, transparent: true, opacity: 0.8 }), // Dynamic water puddle material
    logo: new THREE.MeshStandardMaterial({ color: 0xd946ef })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; 
let currentSelectedType = 'grass'; 

// Increased World Size by 1.5x: 32 * 1.5 = 48 Blocks Grid
const WORLD_SIZE = 48;

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
// 3. HAND AXE RE-SCALING SETUP (MADE SMALLER)
// =========================================================================
const axeGroup = new THREE.Group();

const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2 });
// Reduced dimensions to make it less intrusive
const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.16), bladeMat);
bladeMesh.position.set(0, 0.25, -0.06);
axeGroup.add(bladeMesh);

const handleMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), handleMat);
handleMesh.position.set(0, 0.05, 0);
axeGroup.add(handleMesh);

// Downscaled and shifted further down/right on screen out of view center
axeGroup.scale.set(0.8, 0.8, 0.8);
axeGroup.position.set(0.4, -0.4, -0.55); 
axeGroup.rotation.set(0, Math.PI / 4, 0);
camera.add(axeGroup);
scene.add(camera);

let axeSwingTimer = 0;
let isAxeSwinging = false;

function triggerAxeSwingAnimation() {
    if (isAxeSwinging) return;
    isAxeSwinging = true;
    axeSwingTimer = 0;
}

function updateAxeAnimationLoop() {
    if (!isAxeSwinging) {
        axeGroup.position.lerp(new THREE.Vector3(0.4, -0.4, -0.55), 0.1);
        axeGroup.rotation.set(0, Math.PI / 4, 0);
        return;
    }
    axeSwingTimer += 0.18;
    if (axeSwingTimer >= Math.PI) {
        isAxeSwinging = false;
        return;
    }
    const swingFactor = Math.sin(axeSwingTimer);
    axeGroup.position.z = -0.55 - (swingFactor * 0.12);
    axeGroup.position.y = -0.4 + (swingFactor * 0.06);
    axeGroup.rotation.x = -swingFactor * 1.3; 
}

// =========================================================================
// 4. LANDSCAPE MAP GENERATION (HILL, PUDDLE, RANDOM TREES, SIGN)
// =========================================================================
function spawnTree(trunkX, trunkZ, customHeight = 4) {
    const baseY = 3; 
    // Inject terrain-relative height offsets if a hill is underneath
    let heightOffset = 0;
    activeBlocks.forEach(b => {
        if (Math.round(b.position.x) === trunkX && Math.round(b.position.z) === trunkZ) {
            if (b.position.y >= heightOffset) heightOffset = b.position.y - 1;
        }
    });

    const spawnY = baseY + heightOffset;

    for (let h = 0; h < customHeight; h++) {
        createBlock(trunkX, spawnY + h, trunkZ, 'wood');
    }
    const leafHeight = spawnY + customHeight;
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(trunkX + lx, leafHeight - 1, trunkZ + lz, 'leaves');
            createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves');
        }
    }
    createBlock(trunkX, leafHeight + 1, trunkZ, 'leaves');
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
    const startY = 12; 
    const zPos = 12;   
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
    
    // Centers of terrain features
    const hillCenterX = 12, hillCenterZ = 14;
    const puddleCenterX = 30, puddleCenterZ = 32;

    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            
            // 1. Calculate Hill math formula (spherical radius curve drop)
            const distToHill = Math.sqrt(Math.pow(x - hillCenterX, 2) + Math.pow(z - hillCenterZ, 2));
            let hillHeight = 0;
            if (distToHill < 8) {
                hillHeight = Math.round((8 - distToHill) * 0.6);
            }

            // 2. Calculate Puddle placement logic
            const distToPuddle = Math.sqrt(Math.pow(x - puddleCenterX, 2) + Math.pow(z - puddleCenterZ, 2));
            const isPuddle = distToPuddle < 5;

            // Render Core Layers
            createBlock(x, 0, z, 'stone');
            
            if (isPuddle) {
                // Carve a hole down and fill with water blocks
                createBlock(x, 1, z, 'stone');
                createBlock(x, 2, z, 'water');
            } else {
                // Build normal ground up + hill heights stacked layer blocks
                createBlock(x, 1, z, 'dirt');
                createBlock(x, 2, z, 'grass');
                
                for (let h = 0; h < hillHeight; h++) {
                    createBlock(x, 3 + h, z, (h === hillHeight - 1) ? 'grass' : 'dirt');
                }
            }
        }
    }
    
    buildNickSign();
    
    // Spawn 4 trees (Original 2 + 2 brand new randomized size variants)
    spawnTree(8, 26, 4);   // Tree 1
    spawnTree(38, 14, 4);  // Tree 2
    spawnTree(12, 14, 5);  // New Tree 3 (Tall size variant on top of the hill!)
    spawnTree(22, 38, 3);  // New Tree 4 (Short cute size variant near the landscape center!)

    camera.position.set(WORLD_SIZE / 2, 4.5, WORLD_SIZE - 4);
}

generateDefaultWorld();

// =========================================================================
// 5. UNIFIED NATURAL CAMERA TRACKING ENGINE
// =========================================================================
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0;
let isDraggingCamera = false;

function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    initAudio();
    isDraggingCamera = true;
    const coords = getEventCoords(e);
    lastTrackX = coords.x; lastTrackY = coords.y;
}

function moveTracking(e) {
    if (!isDraggingCamera) return;
    const coords = getEventCoords(e);
    const deltaX = coords.x - lastTrackX;
    const deltaY = coords.y - lastTrackY;
    
    lastTrackX = coords.x; lastTrackY = coords.y;

    const lookSpeed = 0.005;
    euler.setFromQuaternion(camera.quaternion);
    
    euler.y -= deltaX * lookSpeed; 
    euler.x -= deltaY * lookSpeed; // Drag down -> look down mapping
    
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}

function stopTracking() { isDraggingCamera = false; }

document.addEventListener('touchstart', startTracking, { passive: true });
document.addEventListener('touchmove', moveTracking, { passive: true });
document.addEventListener('touchend', stopTracking);
document.addEventListener('mousedown', startTracking);
document.addEventListener('mousemove', moveTracking);
document.addEventListener('mouseup', stopTracking);

// =========================================================================
// 6. RETRO D-PAD COMPASS MOVEMENT BINDINGS
// =========================================================================
const moveDirections = { forward: false, backward: false, left: false, right: false };

function bindDpadDirection(elementId, flagName) {
    const btn = document.getElementById(elementId);
    
    const press = (e) => { e.preventDefault(); initAudio(); moveDirections[flagName] = true; };
    const release = () => { moveDirections[flagName] = false; };
    
    btn.addEventListener('touchstart', press);
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
}

bindDpadDirection('dpad-up', 'forward');
bindDpadDirection('dpad-down', 'backward');
bindDpadDirection('dpad-left', 'left');
bindDpadDirection('dpad-right', 'right');

window.setBlockType = function(type) { 
    currentSelectedType = type; 
    playSound('ui'); 
};

// =========================================================================
// 7. GRAVITY & VELOCITY PIPELINE PHYSICS
// =========================================================================
let playerVelocityY = 0;
let remainingJumpsCount = 2; 
const GRAVITY_CONSTANT = 0.009;
const FORCE_JUMP = 0.16;
const FLOOR_LEVEL_HEIGHT = 4.5; 

function triggerJumpAction(e) {
    if (e) e.preventDefault();
    initAudio();
    if (camera.position.y === FLOOR_LEVEL_HEIGHT) {
        playerVelocityY = FORCE_JUMP;
        remainingJumpsCount = 1; 
        playSound('jump1');
    } else if (remainingJumpsCount === 1) {
        playerVelocityY = FORCE_JUMP * 0.95; 
        remainingJumpsCount = 0; 
        playSound('jump2');
    }
}

const jumpPad = document.getElementById('jump-pad');
jumpPad.addEventListener('touchstart', triggerJumpAction);
jumpPad.addEventListener('mousedown', triggerJumpAction);

function processPhysicsPipeline() {
    playerVelocityY -= GRAVITY_CONSTANT;
    camera.position.y += playerVelocityY;
    
    if (camera.position.y <= FLOOR_LEVEL_HEIGHT) {
        camera.position.y = FLOOR_LEVEL_HEIGHT;
        playerVelocityY = 0;
        remainingJumpsCount = 2; 
    }
}

// =========================================================================
// 8. INTERACTION HANDLERS (PLACE / BREAK)
// =========================================================================
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (!isPlacement) triggerAxeSwingAnimation();

    if (intersects.length > 0 && intersects[0].distance < 10) { 
        const hitBlock = intersects[0].object;
        if (hitBlock.userData.blockType === 'water') return; // Cannot break water blocks

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

const btnBreak = document.getElementById('mb-break');
const btnPlace = document.getElementById('mb-place');

btnBreak.addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
btnBreak.addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(false); });
btnPlace.addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });
btnPlace.addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(true); });

window.addEventListener('contextmenu', e => e.preventDefault());

// =========================================================================
// 9. WORLD SAVING FILE EXPORTS
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
// 10. REAL TIME ANIMATION COMPASS TICK LOOP
// =========================================================================
const WALK_SPEED = 0.11; 

function animate() {
    requestAnimationFrame(animate);
    
    // Build directional vectors relative to camera look angle
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVec.y = 0; forwardVec.normalize();
    
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rightVec.y = 0; rightVec.normalize();

    // Process 4-way D-Pad translational vectors
    if (moveDirections.forward) camera.position.addScaledVector(forwardVec, WALK_SPEED);
    if (moveDirections.backward) camera.position.addScaledVector(forwardVec, -WALK_SPEED);
    if (moveDirections.left) camera.position.addScaledVector(rightVec, -WALK_SPEED);
    if (moveDirections.right) camera.position.addScaledVector(rightVec, WALK_SPEED);
    
    processPhysicsPipeline();
    updateAxeAnimationLoop();
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();