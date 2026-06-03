// =========================================================================
// 0. AUDIO CONTEXT ENGINE
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
    } else if (type === 'death') {
        // High pitched supernatural poof sound for animal ghosts
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
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
            if (style === 'wood' && i % 4 === 0) ctx.fillRect(i, j, 1, 1);
            else if (Math.random() > 0.6) ctx.fillRect(i, j, 1, 1);
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
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

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
// 2. MATERIALS & WORLD GRID SETUP
// =========================================================================
const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f', 'noise') }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c', 'noise') }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252', 'noise') }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c', 'wood') }), 
    leaves: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#166534', '#14532d', 'noise') }),
    water: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.1, transparent: true, opacity: 0.8 }),
    fence: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 }), // Custom dark brown fence texture
    logo: new THREE.MeshStandardMaterial({ color: 0xd946ef })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; 
let activeAnimals = []; // Tracks moving entity states separately
let currentSelectedType = 'grass'; 
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
    return mesh;
}

function clearCurrentWorld() {
    activeBlocks.forEach(block => scene.remove(block));
    activeAnimals.forEach(a => scene.remove(a.mesh));
    activeBlocks = [];
    activeAnimals = [];
}

// Helper to determine accurate ground y position anywhere on the terrain grid
function getGroundYAt(x, z) {
    let highestY = 2; // Baseline default grass height
    activeBlocks.forEach(b => {
        if (Math.round(b.position.x) === Math.round(x) && Math.round(b.position.z) === Math.round(z)) {
            if (b.userData.blockType !== 'water' && b.position.y > highestY) {
                highestY = b.position.y;
            }
        }
    });
    return highestY;
}

// =========================================================================
// 3. RE-PROPORTIONED MINI AXE
// =========================================================================
const axeGroup = new THREE.Group();
const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.14), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2 }));
bladeMesh.position.set(0, 0.22, -0.05);
axeGroup.add(bladeMesh);

const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0x92400e }));
handleMesh.position.set(0, 0.05, 0);
axeGroup.add(handleMesh);

axeGroup.scale.set(0.75, 0.75, 0.75);
axeGroup.position.set(0.42, -0.42, -0.6); 
axeGroup.rotation.set(0, Math.PI / 4, 0);
camera.add(axeGroup);
scene.add(camera);

let axeSwingTimer = 0, isAxeSwinging = false;
function triggerAxeSwingAnimation() { if (!isAxeSwinging) { isAxeSwinging = true; axeSwingTimer = 0; } }

function updateAxeAnimationLoop() {
    if (!isAxeSwinging) {
        axeGroup.position.lerp(new THREE.Vector3(0.42, -0.42, -0.6), 0.1);
        axeGroup.rotation.set(0, Math.PI / 4, 0);
        return;
    }
    axeSwingTimer += 0.2;
    if (axeSwingTimer >= Math.PI) { isAxeSwinging = false; return; }
    const factor = Math.sin(axeSwingTimer);
    axeGroup.position.z = -0.6 - (factor * 0.12);
    axeGroup.position.y = -0.42 + (factor * 0.05);
    axeGroup.rotation.x = -factor * 1.4; 
}

// =========================================================================
// 4. ANIMALS BUILDER MACHINE (HORSE, DOGS, CATS, PIGS)
// =========================================================================
const animalConfig = [
    { type: 'horse', color: 0x78350f, size: [0.7, 0.8, 1.2], count: 1 },
    { type: 'dog', color: 0xd97706, size: [0.4, 0.5, 0.7], count: 2 },
    { type: 'cat', color: 0xf59e0b, size: [0.3, 0.35, 0.5], count: 2 },
    { type: 'pig', color: 0xf472b6, size: [0.5, 0.5, 0.8], count: 3 }
];

function spawnAnimals() {
    animalConfig.forEach(cfg => {
        for (let i = 0; i < cfg.count; i++) {
            // Pick arbitrary coordinates away from the center/spawn zone
            const rx = Math.floor(5 + Math.random() * (WORLD_SIZE - 10));
            const rz = Math.floor(5 + Math.random() * (WORLD_SIZE - 10));
            const ry = getGroundYAt(rx, rz) + (cfg.size[1] / 2) + 0.5;

            const group = new THREE.Group();
            
            // Core main torso block
            const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.8 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), bodyMat);
            body.castShadow = true;
            group.add(body);

            // Miniature head box attachment offset
            const headSize = cfg.size[0] * 0.8;
            const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), bodyMat);
            head.position.set(0, cfg.size[1] * 0.5, -cfg.size[2] * 0.5);
            head.castShadow = true;
            group.add(head);

            group.position.set(rx, ry, rz);
            scene.add(group);

            activeAnimals.push({
                mesh: group,
                type: cfg.type,
                isGhost: false,
                ghostTimer: 0,
                moveTimer: Math.random() * 5,
                vx: 0, vz: 0,
                baseYOffset: cfg.size[1] / 2
            });
        }
    });
}

function updateAnimalsLoop() {
    activeAnimals.forEach(a => {
        if (a.isGhost) {
            // Ghost flying away logic
            a.mesh.position.y += 0.08;
            a.mesh.rotation.y += 0.04;
            a.ghostTimer += 0.016;
            
            // Linearly drop transparency levels matching ghost ascension curves
            a.mesh.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = Math.max(0, 1 - (a.ghostTimer / 1.5));
                }
            });

            if (a.ghostTimer >= 1.5) {
                scene.remove(a.mesh);
                activeAnimals = activeAnimals.filter(item => item !== a);
            }
            return;
        }

        // Standard animal wandering kinematics
        a.moveTimer -= 0.016;
        if (a.moveTimer <= 0) {
            a.moveTimer = 2 + Math.random() * 4;
            if (Math.random() > 0.4) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.03;
                a.vx = Math.cos(angle) * speed;
                a.vz = Math.sin(angle) * speed;
                a.mesh.rotation.y = -angle + Math.PI/2;
            } else {
                a.vx = 0; a.vz = 0;
            }
        }

        a.mesh.position.x += a.vx;
        a.mesh.position.z += a.vz;

        // Contain animal coords tightly inside perimeter lines
        a.mesh.position.x = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.x));
        a.mesh.position.z = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.z));

        // Snap vertical alignment tightly down over terrain levels 
        const currentGround = getGroundYAt(a.mesh.position.x, a.mesh.position.z);
        a.mesh.position.y = currentGround + 0.5 + a.baseYOffset;
    });
}

// =========================================================================
// 5. LANDSCAPE GENERATION WITH WOODEN PERIMETER FENCES
// =========================================================================
function spawnTree(trunkX, trunkZ, customHeight = 4) {
    // Look up surface geometry to ensure precise grounding
    const surfaceY = getGroundYAt(trunkX, trunkZ);
    const startY = surfaceY + 1;

    for (let h = 0; h < customHeight; h++) {
        createBlock(trunkX, startY + h, trunkZ, 'wood');
    }
    const leafHeight = startY + customHeight;
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(trunkX + lx, leafHeight - 1, trunkZ + lz, 'leaves');
            createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves');
        }
    }
    createBlock(trunkX, leafHeight + 1, trunkZ, 'leaves');
}

function generateDefaultWorld() {
    clearCurrentWorld();
    
    const hillCenterX = 12, hillCenterZ = 14;
    const puddleCenterX = 30, puddleCenterZ = 32;

    // Phase 1: Build base floor and hill terrains
    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const distToHill = Math.sqrt(Math.pow(x - hillCenterX, 2) + Math.pow(z - hillCenterZ, 2));
            let hillHeight = 0;
            if (distToHill < 8) hillHeight = Math.round((8 - distToHill) * 0.6);

            const distToPuddle = Math.sqrt(Math.pow(x - puddleCenterX, 2) + Math.pow(z - puddleCenterZ, 2));
            const isPuddle = distToPuddle < 5;

            createBlock(x, 0, z, 'stone');
            
            if (isPuddle) {
                createBlock(x, 1, z, 'stone');
                createBlock(x, 2, z, 'water');
            } else {
                createBlock(x, 1, z, 'dirt');
                createBlock(x, 2, z, 'grass');
                for (let h = 0; h < hillHeight; h++) {
                    createBlock(x, 3 + h, z, (h === hillHeight - 1) ? 'grass' : 'dirt');
                }
            }
        }
    }
    
    // Phase 2: Generate fence barriers around edges
    for (let i = 0; i < WORLD_SIZE; i++) {
        // North & South Edges
        const gyN = getGroundYAt(i, 0); createBlock(i, gyN + 1, 0, 'fence');
        const gyS = getGroundYAt(i, WORLD_SIZE - 1); createBlock(i, gyS + 1, WORLD_SIZE - 1, 'fence');
        
        // East & West Edges
        const gyE = getGroundYAt(0, i); createBlock(0, gyE + 1, i, 'fence');
        const gyW = getGroundYAt(WORLD_SIZE - 1, i); createBlock(WORLD_SIZE - 1, gyW + 1, i, 'fence');
    }

    // Phase 3: Plant completely grounded trees
    spawnTree(8, 26, 4);   
    spawnTree(38, 14, 4);  
    spawnTree(12, 14, 5);  // Perfectly sits on top of hill now!
    spawnTree(22, 38, 3);  

    spawnAnimals();
    camera.position.set(WORLD_SIZE / 2, 4.5, WORLD_SIZE - 4);
}

generateDefaultWorld();

// =========================================================================
// 6. CAMERA LOOK DRAG CHANNELS
// =========================================================================
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0, isDraggingCamera = false;

function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
}

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    initAudio(); isDraggingCamera = true;
    const coords = getEventCoords(e);
    lastTrackX = coords.x; lastTrackY = coords.y;
}

function moveTracking(e) {
    if (!isDraggingCamera) return;
    const coords = getEventCoords(e);
    const deltaX = coords.x - lastTrackX; const deltaY = coords.y - lastTrackY;
    lastTrackX = coords.x; lastTrackY = coords.y;

    euler.setFromQuaternion(camera.quaternion);
    euler.y -= deltaX * 0.005; euler.x -= deltaY * 0.005;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}

document.addEventListener('touchstart', startTracking, { passive: true });
document.addEventListener('touchmove', moveTracking, { passive: true });
document.addEventListener('touchend', () => isDraggingCamera = false);
document.addEventListener('mousedown', startTracking);
document.addEventListener('mousemove', moveTracking);
document.addEventListener('mouseup', () => isDraggingCamera = false);

// =========================================================================
// 7. MOVEMENT INTERFACE MANAGEMENT (D-PAD STATE ROUTER)
// =========================================================================
const moveDirections = { forward: false, backward: false, left: false, right: false };

function bindDpadDirection(elementId, flagName) {
    const btn = document.getElementById(elementId);
    const press = (e) => { e.preventDefault(); initAudio(); moveDirections[flagName] = true; };
    const release = () => { moveDirections[flagName] = false; };
    
    btn.addEventListener('touchstart', press); btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press); btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
}

bindDpadDirection('dpad-up', 'forward');
bindDpadDirection('dpad-down', 'backward');
bindDpadDirection('dpad-left', 'left');
bindDpadDirection('dpad-right', 'right');

window.setBlockType = function(t) { currentSelectedType = t; playSound('ui'); };

// =========================================================================
// 8. PHYSICS ENGINE (JUMP & DOUBLE-JUMP Mechanics)
// =========================================================================
let playerVelocityY = 0, remainingJumpsCount = 2; 
const GRAVITY_CONSTANT = 0.009, FORCE_JUMP = 0.16, FLOOR_LEVEL_HEIGHT = 4.5; 

function triggerJumpAction(e) {
    if (e) e.preventDefault();
    initAudio();
    if (camera.position.y === FLOOR_LEVEL_HEIGHT) {
        playerVelocityY = FORCE_JUMP; remainingJumpsCount = 1; playSound('jump1');
    } else if (remainingJumpsCount === 1) {
        playerVelocityY = FORCE_JUMP * 0.95; remainingJumpsCount = 0; playSound('jump2');
    }
}
document.getElementById('jump-pad').addEventListener('touchstart', triggerJumpAction);
document.getElementById('jump-pad').addEventListener('mousedown', triggerJumpAction);

function processPhysicsPipeline() {
    playerVelocityY -= GRAVITY_CONSTANT; camera.position.y += playerVelocityY;
    if (camera.position.y <= FLOOR_LEVEL_HEIGHT) {
        camera.position.y = FLOOR_LEVEL_HEIGHT; playerVelocityY = 0; remainingJumpsCount = 2; 
    }
}

// =========================================================================
// 9. BREAK / PLACE INTERACTION RAYCASTER & GHOST TRIGGER
// =========================================================================
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    if (!isPlacement) triggerAxeSwingAnimation();

    // Check animal hits first when hitting BREAK
    if (!isPlacement) {
        // Collect mesh contents inside standard bounding boxes
        const animalMeshes = activeAnimals.filter(a => !a.isGhost).map(a => a.mesh.children[0]);
        const animalIntersects = raycaster.intersectObjects(animalMeshes);
        
        if (animalIntersects.length > 0 && animalIntersects[0].distance < 8) {
            const hitChild = animalIntersects[0].object;
            const parentGroup = hitChild.parent;
            const animalObject = activeAnimals.find(a => a.mesh === parentGroup);
            
            if (animalObject) {
                playSound('death');
                animalObject.isGhost = true; // Flag object to begin ghost ascension update loop
                
                // Convert materials to transparent modes
                parentGroup.children.forEach(child => {
                    if (child.material) {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                        child.material.color.setHex(0xffffff); // Turn pure ghostly white
                    }
                });
                return;
            }
        }
    }

    // Default block creation / destruction fallback routines
    const intersects = raycaster.intersectObjects(activeBlocks);
    if (intersects.length > 0 && intersects[0].distance < 10) { 
        const hitBlock = intersects[0].object;
        if (hitBlock.userData.blockType === 'water') return;

        if (!isPlacement) {
            playSound('break'); scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } else {
            playSound('place'); 
            const normal = intersects[0].face.normal;
            createBlock(Math.round(hitBlock.position.x + normal.x), Math.round(hitBlock.position.y + normal.y), Math.round(hitBlock.position.z + normal.z), currentSelectedType);
        }
    }
}

document.getElementById('mb-break').addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-break').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-place').addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(true); });
document.getElementById('mb-place').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });

window.addEventListener('contextmenu', e => e.preventDefault());

// =========================================================================
// 10. REAL TIME ANIMATION TICK TICK TICK
// =========================================================================
const WALK_SPEED = 0.11; 

function animate() {
    requestAnimationFrame(animate);
    
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVec.y = 0; forwardVec.normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    rightVec.y = 0; rightVec.normalize();

    if (moveDirections.forward) camera.position.addScaledVector(forwardVec, WALK_SPEED);
    if (moveDirections.backward) camera.position.addScaledVector(forwardVec, -WALK_SPEED);
    if (moveDirections.left) camera.position.addScaledVector(rightVec, -WALK_SPEED);
    if (moveDirections.right) camera.position.addScaledVector(rightVec, WALK_SPEED);
    
    // Lock character position safely inside fence walls
    camera.position.x = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.x));
    camera.position.z = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.z));

    processPhysicsPipeline();
    updateAxeAnimationLoop();
    updateAnimalsLoop();
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();