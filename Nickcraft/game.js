// =========================================================================
// 0. AUDIO CONTEXT CONTROLLER
// =========================================================================
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playSound(type) {
    initAudio(); if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'break') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.15);
        gainNode.gain.setValueAtTime(0.4, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'death') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        gainNode.gain.setValueAtTime(0.25, now); gainNode.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
    } else if (type === 'place') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(230, now + 0.08);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'jump1') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.12);
        gainNode.gain.setValueAtTime(0.18, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'jump2') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
        gainNode.gain.setValueAtTime(0.22, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.14);
        osc.start(now); osc.stop(now + 0.14);
    } else if (type === 'crackle') {
        osc.type = 'square'; osc.frequency.setValueAtTime(70 + Math.random() * 40, now);
        gainNode.gain.setValueAtTime(0.08, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'ui') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    }
}

// =========================================================================
// 1. ENGINE INITIALIZATION & EXTENDED DAY/NIGHT CYCLES
// =========================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.6);
sunLight.position.set(40, 80, 20);
sunLight.castShadow = true;
scene.add(sunLight);

let worldTime = 0; 
function updateDayNightCycle() {
    // Cut progression modifier in half (0.001 instead of 0.002) to double daytime lengths
    worldTime += 0.001;
    const dayFactor = (Math.sin(worldTime) + 1) / 2; 
    
    const skyColor = new THREE.Color(0x0b0f19).lerp(new THREE.Color(0x87CEEB), dayFactor);
    scene.background = skyColor;
    if (scene.fog) scene.fog.color = skyColor;
    
    ambientLight.intensity = 0.15 + (dayFactor * 0.55);
    sunLight.intensity = dayFactor * 0.7;
    sunLight.position.x = Math.cos(worldTime) * 60;
    sunLight.position.y = Math.sin(worldTime) * 60;

    // Dynamically power firepit point lights when night sets in
    const nightIntensity = (1.0 - dayFactor) * 1.8;
    firepitsArray.forEach(f => { f.light.intensity = nightIntensity; });
}

// =========================================================================
// 2. VOXEL MATERIALS SETUP
// =========================================================================
function createVoxelTexture(baseColor, noiseColor, style) {
    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = noiseColor;
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
            if (style === 'wood' && i % 4 === 0) ctx.fillRect(i, j, 1, 1);
            else if (Math.random() > 0.6) ctx.fillRect(i, j, 1, 1);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    return texture;
}

const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f', 'noise') }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c', 'noise') }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252', 'noise') }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c', 'wood') }), 
    leaves: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#166534', '#14532d', 'noise') }),
    water: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.1, transparent: true, opacity: 0.75 }),
    fence: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 }),
    coal: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#2d2d2d', '#1a1a1a', 'noise') })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; let activeAnimals = []; let firepitsArray = []; let particleSystems = [];
let currentSelectedType = 'grass'; const WORLD_SIZE = 48;

function createBlock(x, y, z, type) {
    const material = materials[type] || materials.grass;
    const mesh = new THREE.Mesh(blockGeometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { blockType: type }; scene.add(mesh); activeBlocks.push(mesh);
    return mesh;
}

function clearCurrentWorld() {
    activeBlocks.forEach(b => scene.remove(b)); activeAnimals.forEach(a => scene.remove(a.mesh));
    firepitsArray.forEach(f => { scene.remove(f.mesh); scene.remove(f.light); });
    activeBlocks = []; activeAnimals = []; firepitsArray = [];
}

function getGroundYAt(x, z) {
    let highestY = 2;
    activeBlocks.forEach(b => {
        if (Math.round(b.position.x) === Math.round(x) && Math.round(b.position.z) === Math.round(z)) {
            if (b.userData.blockType !== 'water' && b.position.y > highestY) highestY = b.position.y;
        }
    });
    return highestY;
}

// =========================================================================
// 3. ADVANCED PARTICLE CONTROLLER (SHARDS & DRIFTING SMOKE)
// =========================================================================
function spawnBlockBreakParticles(x, y, z, colorHex) {
    const count = 10; const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 });
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat); p.position.set(x + (Math.random()-0.5)*0.4, y + (Math.random()-0.5)*0.4, z + (Math.random()-0.5)*0.4);
        scene.add(p);
        particleSystems.push({ mesh: p, type: 'shard', vx: (Math.random()-0.5)*0.08, vy: 0.08 + Math.random()*0.08, vz: (Math.random()-0.5)*0.08, life: 1.0 });
    }
}

function spawnSmokeParticle(x, y, z) {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.4 });
    const p = new THREE.Mesh(geo, mat); p.position.set(x + (Math.random()-0.5)*0.3, y + 0.3, z + (Math.random()-0.5)*0.3);
    scene.add(p);
    particleSystems.push({ mesh: p, type: 'smoke', vx: (Math.random()-0.5)*0.015, vy: 0.02 + Math.random()*0.015, vz: (Math.random()-0.5)*0.015, life: 1.0 });
}

function updateParticles() {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const p = particleSystems[i];
        if (p.type === 'shard') {
            p.vy -= 0.006; p.life -= 0.025;
        } else if (p.type === 'smoke') {
            p.mesh.scale.addScalar(0.015); p.life -= 0.012; // Smoke expands as it rises smoothly
        }
        p.mesh.position.x += p.vx; p.mesh.position.y += p.vy; p.mesh.position.z += p.vz;
        if (p.mesh.material) p.mesh.material.opacity = p.life * (p.type === 'smoke' ? 0.4 : 1.0);
        
        if (p.life <= 0) { scene.remove(p.mesh); particleSystems.splice(i, 1); }
    }
}

// =========================================================================
// 4. DOWNSIZED MINI AXE CONTROLLER
// =========================================================================
const axeGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.12), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
blade.position.set(0, 0.2, -0.04); axeGroup.add(blade);
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0x78350f }));
handle.position.set(0, 0.04, 0); axeGroup.add(handle);

axeGroup.scale.set(0.7, 0.7, 0.7); axeGroup.position.set(0.42, -0.42, -0.6);
axeGroup.rotation.set(0, Math.PI / 4, 0); camera.add(axeGroup); scene.add(camera);

let axeSwingTimer = 0, isAxeSwinging = false;
function triggerAxeSwingAnimation() { if (!isAxeSwinging) { isAxeSwinging = true; axeSwingTimer = 0; } }
function updateAxeAnimationLoop() {
    if (!isAxeSwinging) { axeGroup.position.lerp(new THREE.Vector3(0.42, -0.42, -0.6), 0.1); axeGroup.rotation.set(0, Math.PI / 4, 0); return; }
    axeSwingTimer += 0.22; if (axeSwingTimer >= Math.PI) { isAxeSwinging = false; return; }
    const f = Math.sin(axeSwingTimer); axeGroup.position.z = -0.6 - (f * 0.14); axeGroup.position.y = -0.42 + (f * 0.06); axeGroup.rotation.x = -f * 1.5;
}

// =========================================================================
// 5. 4 MULTI-ELEMENT DETAILED FIREPITS WITH NIGHT LIGHT GLOWS
// =========================================================================
function buildFirepit(cx, cz) {
    const cy = getGroundYAt(cx, cz) + 1;
    const group = new THREE.Group();
    
    // Charcoal Ring base foundation
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 1.3), materials.coal); base.castShadow = true; base.receiveShadow = true;
    group.add(base);
    
    // Stacked internal cross log layers to increase realism layout aesthetics
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.2), logMat); log1.position.y = 0.15; log1.rotation.y = 0.4; group.add(log1);
    const log2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.2), logMat); log2.position.y = 0.22; log2.rotation.y = -0.6; group.add(log2);

    // Dynamic Multi-layered Fire Elements
    const fireGeo = new THREE.BoxGeometry(0.55, 0.5, 0.55);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.85 });
    const fireMesh = new THREE.Mesh(fireGeo, fireMat); fireMesh.position.y = 0.35;
    group.add(fireMesh);
    
    group.position.set(cx, cy - 0.4, cz); scene.add(group);
    
    // Dynamic Night Glow Light Source mapping point attachments
    const pLight = new THREE.PointLight(0xf97316, 0, 12, 1.5);
    pLight.position.set(cx, cy + 0.5, cz); scene.add(pLight);
    
    firepitsArray.push({ mesh: group, fire: fireMesh, light: pLight, x: cx, y: cy, z: cz, smokeTimer: 0 });
}

function updateFirepitsLoop() {
    firepitsArray.forEach(f => {
        // Significantly reduced wave speeds (multiplied by 0.004 instead of 0.02) to create smooth, gentle animations
        const timeRef = Date.now();
        const pulseY = 1.0 + Math.sin(timeRef * 0.003) * 0.12;
        const pulseXZ = 0.9 + Math.cos(timeRef * 0.002) * 0.08;
        f.fire.scale.set(pulseXZ, pulseY, pulseXZ);
        
        if (Math.random() > 0.93) {
            f.fire.material.color.setHex(Math.random() > 0.4 ? 0xf97316 : 0xef4444);
            if (Math.random() > 0.8) playSound('crackle');
        }
        
        // Smoke emissions pipeline tracking clocks
        f.smokeTimer += 1;
        if (f.smokeTimer % 22 === 0) spawnSmokeParticle(f.x, f.y, f.z);
        
        // Singe push interaction mechanics
        const dx = camera.position.x - f.x; const dz = camera.position.z - f.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 1.1 && Math.abs(camera.position.y - f.y) < 1.8) {
            playerVelocityY = 0.13;
            camera.position.x += (dx === 0 ? 0.2 : Math.sign(dx) * 0.22);
            camera.position.z += (dz === 0 ? 0.2 : Math.sign(dz) * 0.22);
            playSound('jump2');
        }
    });
}

// =========================================================================
// 6. ANIMALS SYSTEM (SMART MOB PATHING ROUTINES)
// =========================================================================
const animalConfig = [
    { type: 'horse', color: 0x5c2d17, size: [0.7, 0.8, 1.1], count: 1 },
    { type: 'dog', color: 0xc2410c, size: [0.4, 0.45, 0.65], count: 2 },
    { type: 'cat', color: 0xd97706, size: [0.3, 0.3, 0.45], count: 2 },
    { type: 'pig', color: 0xf472b6, size: [0.5, 0.5, 0.75], count: 3 }
];

function spawnAnimals() {
    animalConfig.forEach(cfg => {
        for (let i = 0; i < cfg.count; i++) {
            const rx = Math.floor(6 + Math.random() * (WORLD_SIZE - 12));
            const rz = Math.floor(6 + Math.random() * (WORLD_SIZE - 12));
            const ry = getGroundYAt(rx, rz) + (cfg.size[1]/2) + 0.5;

            const group = new THREE.Group();
            const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.85 });
            const body = new THREE.Mesh(new THREE.BoxGeometry(...cfg.size), bodyMat); body.castShadow = true; group.add(body);
            const headSize = cfg.size[0] * 0.75;
            const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), bodyMat);
            head.position.set(0, cfg.size[1]*0.4, -cfg.size[2]*0.45); head.castShadow = true; group.add(head);

            group.position.set(rx, ry, rz); scene.add(group);
            activeAnimals.push({ mesh: group, type: cfg.type, colorHex: cfg.color, isGhost: false, ghostTimer: 0, moveTimer: Math.random() * 4, vx: 0, vz: 0, bY: cfg.size[1]/2 });
        }
    });
}

function updateAnimalsLoop() {
    activeAnimals.forEach(a => {
        if (a.isGhost) {
            a.mesh.position.y += 0.09; a.mesh.rotation.y += 0.05; a.ghostTimer += 0.016;
            a.mesh.children.forEach(c => { if (c.material) c.material.opacity = Math.max(0, 1 - (a.ghostTimer / 1.4)); });
            if (a.ghostTimer >= 1.4) { scene.remove(a.mesh); activeAnimals = activeAnimals.filter(item => item !== a); }
            return;
        }

        a.moveTimer -= 0.016;
        if (a.moveTimer <= 0) {
            a.moveTimer = 3 + Math.random() * 3;
            if (a.type === 'pig') {
                const dx = 30 - a.mesh.position.x; const dz = 32 - a.mesh.position.z;
                const angle = Math.atan2(dz, dx) + (Math.random() - 0.5);
                a.vx = Math.cos(angle) * 0.025; a.vz = Math.sin(angle) * 0.025;
                a.mesh.rotation.y = -angle + Math.PI/2;
            } else if (a.type === 'horse' && Math.random() > 0.75) {
                a.vx = 0; a.vz = 0;
                const hx = Math.round(a.mesh.position.x); const hz = Math.round(a.mesh.position.z);
                activeBlocks.forEach(b => {
                    if (Math.round(b.position.x) === hx && Math.round(b.position.z) === hz && b.userData.blockType === 'grass') { b.material = materials.dirt; b.userData.blockType = 'dirt'; }
                });
            } else if (Math.random() > 0.3) {
                const angle = Math.random() * Math.PI * 2;
                a.vx = Math.cos(angle) * 0.03; a.vz = Math.sin(angle) * 0.03;
                a.mesh.rotation.y = -angle + Math.PI/2;
            } else {
                a.vx = 0; a.vz = 0;
            }
        }
        a.mesh.position.x += a.vx; a.mesh.position.z += a.vz;
        a.mesh.position.x = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.x));
        a.mesh.position.z = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.z));
        a.mesh.position.y = getGroundYAt(a.mesh.position.x, a.mesh.position.z) + 0.5 + a.bY;
    });
}

// =========================================================================
// 7. LEVEL GENERATOR & BOUNDARY WOODEN FENCES
// =========================================================================
function spawnTree(trunkX, trunkZ, customHeight = 4) {
    const surfaceY = getGroundYAt(trunkX, trunkZ); const startY = surfaceY + 1;
    for (let h = 0; h < customHeight; h++) createBlock(trunkX, startY + h, trunkZ, 'wood');
    const leafHeight = startY + customHeight;
    for (let lx = -1; lx <= 1; lx++) {
        for (let lz = -1; lz <= 1; lz++) {
            createBlock(trunkX + lx, leafHeight - 1, trunkZ + lz, 'leaves'); createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves');
        }
    }
    createBlock(trunkX, leafHeight + 1, trunkZ, 'leaves');
}

function generateDefaultWorld() {
    clearCurrentWorld(); scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);
    const hillCenterX = 12, hillCenterZ = 14; const puddleCenterX = 30, puddleCenterZ = 32;

    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const distToHill = Math.sqrt(Math.pow(x - hillCenterX, 2) + Math.pow(z - hillCenterZ, 2));
            let hillHeight = 0; if (distToHill < 8) hillHeight = Math.round((8 - distToHill) * 0.6);
            const distToPuddle = Math.sqrt(Math.pow(x - puddleCenterX, 2) + Math.pow(z - puddleCenterZ, 2));
            const isPuddle = distToPuddle < 5;

            createBlock(x, 0, z, 'stone');
            if (isPuddle) {
                createBlock(x, 1, z, 'stone'); createBlock(x, 2, z, 'water');
            } else {
                createBlock(x, 1, z, 'dirt'); createBlock(x, 2, z, 'grass');
                for (let h = 0; h < hillHeight; h++) createBlock(x, 3 + h, z, (h === hillHeight - 1) ? 'grass' : 'dirt');
            }
        }
    }
    
    // Level boundary fence passes
    for (let i = 0; i < WORLD_SIZE; i++) {
        createBlock(i, getGroundYAt(i, 0) + 1, 0, 'fence'); createBlock(i, getGroundYAt(i, WORLD_SIZE - 1) + 1, WORLD_SIZE - 1, 'fence');
        createBlock(0, getGroundYAt(0, i) + 1, i, 'fence'); createBlock(WORLD_SIZE - 1, getGroundYAt(WORLD_SIZE - 1, i) + 1, i, 'fence');
    }

    spawnTree(8, 26, 4); spawnTree(38, 14, 4); spawnTree(12, 14, 5); spawnTree(22, 38, 3);
    
    // Planted exactly 4 detailed firepits across the game board quadrants
    buildFirepit(18, 20); buildFirepit(32, 15);
    buildFirepit(12, 34); buildFirepit(35, 36);

    spawnAnimals(); camera.position.set(WORLD_SIZE / 2, 4.5, WORLD_SIZE - 4);
}

// =========================================================================
// 8. HOTBAR INTERFACE ENGINE
// =========================================================================
window.selectSlot = function(type) {
    currentSelectedType = type; playSound('ui');
    document.querySelectorAll('.hotbar-slot').forEach(slot => slot.classList.remove('active-slot'));
    const slotEl = document.getElementById(`slot-${type}`); if (slotEl) slotEl.classList.add('active-slot');
};

// =========================================================================
// 9. LOOK DRAG & MOVEMENT INTERFACES (OPEN CROSS MECHANICS)
// =========================================================================
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0, isDraggingCamera = false;
function getEventCoords(e) { return e.touches && e.touches.length > 0 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }; }

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone')) return;
    initAudio(); isDraggingCamera = true; const c = getEventCoords(e); lastTrackX = c.x; lastTrackY = c.y;
}
function moveTracking(e) {
    if (!isDraggingCamera) return; const c = getEventCoords(e);
    const dx = c.x - lastTrackX; const dy = c.y - lastTrackY; lastTrackX = c.x; lastTrackY = c.y;
    euler.setFromQuaternion(camera.quaternion); euler.y -= dx * 0.0045; euler.x -= dy * 0.0045;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
}
document.addEventListener('touchstart', startTracking, { passive: true }); document.addEventListener('touchmove', moveTracking, { passive: true });
document.addEventListener('touchend', () => isDraggingCamera = false); document.addEventListener('mousedown', startTracking);
document.addEventListener('mousemove', moveTracking); document.addEventListener('mouseup', () => isDraggingCamera = false);

const moveDirections = { forward: false, backward: false, left: false, right: false };
function bindDpadDirection(id, flag) {
    const el = document.getElementById(id);
    const press = (e) => { e.preventDefault(); initAudio(); moveDirections[flag] = true; };
    const release = () => { moveDirections[flag] = false; };
    el.addEventListener('touchstart', press); el.addEventListener('touchend', release);
    el.addEventListener('mousedown', press); el.addEventListener('mouseup', release); el.addEventListener('mouseleave', release);
}
bindDpadDirection('dpad-up', 'forward'); bindDpadDirection('dpad-down', 'backward');
bindDpadDirection('dpad-left', 'left'); bindDpadDirection('dpad-right', 'right');

// =========================================================================
// 10. PHYSICS & GRAVITY CONSTANTS
// =========================================================================
let playerVelocityY = 0, remainingJumpsCount = 2;
const GRAVITY_CONSTANT = 0.009, FORCE_JUMP = 0.165, FLOOR_LEVEL_HEIGHT = 4.5;

function triggerJumpAction(e) {
    if (e) e.preventDefault(); initAudio();
    if (camera.position.y === FLOOR_LEVEL_HEIGHT) {
        playerVelocityY = FORCE_JUMP; remainingJumpsCount = 1; playSound('jump1');
    } else if (remainingJumpsCount === 1) {
        playerVelocityY = FORCE_JUMP * 0.92; remainingJumpsCount = 0; playSound('jump2');
    }
}
document.getElementById('jump-pad').addEventListener('touchstart', triggerJumpAction);
document.getElementById('jump-pad').addEventListener('mousedown', triggerJumpAction);

function processPhysicsPipeline() {
    playerVelocityY -= GRAVITY_CONSTANT; camera.position.y += playerVelocityY;
    if (camera.position.y <= FLOOR_LEVEL_HEIGHT) { camera.position.y = FLOOR_LEVEL_HEIGHT; playerVelocityY = 0; remainingJumpsCount = 2; }
}

// =========================================================================
// 11. ACTION TARGET RAYCASTERS
// =========================================================================
const raycaster = new THREE.Raycaster(); const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    if (!isPlacement) triggerAxeSwingAnimation();

    if (!isPlacement) {
        const meshes = activeAnimals.filter(a => !a.isGhost).map(a => a.mesh.children[0]);
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0 && intersects[0].distance < 8) {
            const group = intersects[0].object.parent; const animal = activeAnimals.find(a => a.mesh === group);
            if (animal) {
                playSound('death'); animal.isGhost = true;
                spawnBlockBreakParticles(group.position.x, group.position.y, group.position.z, animal.colorHex);
                group.children.forEach(c => { if (c.material) { c.material = c.material.clone(); c.material.transparent = true; c.material.color.setHex(0xffffff); } });
                return;
            }
        }
    }

    const intersects = raycaster.intersectObjects(activeBlocks);
    if (intersects.length > 0 && intersects[0].distance < 10) {
        const block = intersects[0].object; if (block.userData.blockType === 'water') return;
        if (!isPlacement) {
            playSound('break'); let targetColor = block.material.color ? block.material.color.getHex() : 0xcccccc;
            spawnBlockBreakParticles(block.position.x, block.position.y, block.position.z, targetColor);
            scene.remove(block); activeBlocks = activeBlocks.filter(b => b !== block);
        } else {
            playSound('place'); const n = intersects[0].face.normal;
            createBlock(Math.round(block.position.x + n.x), Math.round(block.position.y + n.y), Math.round(block.position.z + n.z), currentSelectedType);
        }
    }
}

document.getElementById('mb-break').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-break').addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(false); });
document.getElementById('mb-place').addEventListener('touchstart', (e) => { e.preventDefault(); handleBlockAction(true); });
document.getElementById('mb-place').addEventListener('mousedown', (e) => { e.preventDefault(); handleBlockAction(true); });
window.addEventListener('contextmenu', e => e.preventDefault());

// =========================================================================
// 12. SNAPSHOT DATA BACKUPS
// =========================================================================
window.saveWorld = function() {
    playSound('ui'); const data = activeBlocks.map(b => ({ x: b.position.x, y: b.position.y, z: b.position.z, type: b.userData.blockType }));
    localStorage.setItem('nickcraft_v3_save', JSON.stringify(data)); alert('World Saved Successfully!');
};
window.loadWorld = function() {
    playSound('ui'); const data = localStorage.getItem('nickcraft_v3_save'); if (!data) return alert('No snapshot record found!');
    clearCurrentWorld(); JSON.parse(data).forEach(b => createBlock(b.x, b.y, b.z, b.type)); alert('World Loaded Successfully!');
};

// =========================================================================
// 13. MAIN MASTER FRAME TICK LOOP RUNNER
// =========================================================================
const WALK_SPEED = 0.11;
function animate() {
    requestAnimationFrame(animate);
    
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); forwardVec.y = 0; forwardVec.normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); rightVec.y = 0; rightVec.normalize();

    if (moveDirections.forward) camera.position.addScaledVector(forwardVec, WALK_SPEED);
    if (moveDirections.backward) camera.position.addScaledVector(forwardVec, -WALK_SPEED);
    if (moveDirections.left) camera.position.addScaledVector(rightVec, -WALK_SPEED);
    if (moveDirections.right) camera.position.addScaledVector(rightVec, WALK_SPEED);

    camera.position.x = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.x));
    camera.position.z = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.z));

    processPhysicsPipeline(); updateAxeAnimationLoop(); updateAnimalsLoop(); updateFirepitsLoop(); updateParticles(); updateDayNightCycle();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
generateDefaultWorld(); animate();