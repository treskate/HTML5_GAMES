// =========================================================================
// 0. AUDIO SYNTHESIS SOUND CONTROLLERS
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
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.12);
        gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'death') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'place') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(230, now + 0.06);
        gainNode.gain.setValueAtTime(0.25, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now); osc.stop(now + 0.06);
    } else if (type === 'jump1') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
        gainNode.gain.setValueAtTime(0.15, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'jump2') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
        gainNode.gain.setValueAtTime(0.18, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now); osc.stop(now + 0.12);
    } else if (type === 'crackle') {
        osc.type = 'square'; osc.frequency.setValueAtTime(60 + Math.random() * 30, now);
        gainNode.gain.setValueAtTime(0.04, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.03);
        osc.start(now); osc.stop(now + 0.03);
    } else if (type === 'ui') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(550, now);
        gainNode.gain.setValueAtTime(0.04, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'hurt') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.18);
        gainNode.gain.setValueAtTime(0.25, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now); osc.stop(now + 0.18);
    }
}

// =========================================================================
// 1. ENGINE DESIGN & SWEET SPOT MAP SIZE (80 BLOCKS WIDE)
// =========================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 0.65);
sunLight.position.set(40, 70, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 512; 
sunLight.shadow.mapSize.height = 512;
scene.add(sunLight);

// The map is now set back to a spacious 80x80 blocks
const WORLD_SIZE = 80; 
let worldTime = 0, currentDayFactor = 1.0; 

function updateDayNightCycle() {
    worldTime += 0.0012;
    currentDayFactor = (Math.sin(worldTime) + 1) / 2; 
    
    const skyColor = new THREE.Color(0x0a0d1a).lerp(new THREE.Color(0x87CEEB), currentDayFactor);
    scene.background = skyColor;
    if (scene.fog) scene.fog.color = skyColor;
    
    ambientLight.intensity = 0.22 + (currentDayFactor * 0.5);
    sunLight.intensity = currentDayFactor * 0.65;
    sunLight.position.x = Math.cos(worldTime) * 65;
    sunLight.position.y = Math.sin(worldTime) * 65;

    const nightIntensity = (1.0 - currentDayFactor) * 1.6;
    firepitsArray.forEach(f => { f.light.intensity = nightIntensity; });

    manageZombieSpawnsAndSunburns();
}

// =========================================================================
// 2. STYLIZED PROCEDURAL MATERIAL FACTORIES
// =========================================================================
function createVoxelTexture(baseColor, noiseColor) {
    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = noiseColor;
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) { if (Math.random() > 0.65) ctx.fillRect(i, j, 1, 1); }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter;
    return texture;
}

const materials = {
    grass: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#557a2b', '#3f5e1f'), roughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#866043', '#66462c'), roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#737373', '#525252'), roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#f97316', '#c2410c'), roughness: 0.8 }), 
    leaves: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#166534', '#14532d'), roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, transparent: true, opacity: 0.75 }),
    fence: new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 }),
    coal: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#2d2d2d', '#1a1a1a') }),
    zombieSkin: new THREE.MeshStandardMaterial({ color: 0x16a34a }),
    zombieShirt: new THREE.MeshStandardMaterial({ color: 0x2563eb })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; let activeAnimals = []; let activeZombies = []; let firepitsArray = []; let particleSystems = [];
let currentSelectedType = 'grass';

function createBlock(x, y, z, type, optimizeHidden = false) {
    // Performance optimization: Cull subsurface blocks to eliminate underground rendering completely
    if (optimizeHidden && y < 1) return null;
    
    const material = materials[type] || materials.grass;
    const mesh = new THREE.Mesh(blockGeometry, material);
    mesh.position.set(x, y, z);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix(); 
    mesh.castShadow = (y > 0); mesh.receiveShadow = true;
    mesh.userData = { blockType: type }; scene.add(mesh); activeBlocks.push(mesh);
    return mesh;
}

function clearCurrentWorld() {
    activeBlocks.forEach(b => scene.remove(b)); activeAnimals.forEach(a => scene.remove(a.mesh));
    activeZombies.forEach(z => scene.remove(z.mesh)); firepitsArray.forEach(f => { scene.remove(f.mesh); scene.remove(f.light); });
    activeBlocks = []; activeAnimals = []; activeZombies = []; firepitsArray = [];
}

function getGroundYAt(x, z) {
    let highestY = 2;
    for (let i = 0; i < activeBlocks.length; i++) {
        const b = activeBlocks[i];
        if (Math.round(b.position.x) === Math.round(x) && Math.round(b.position.z) === Math.round(z)) {
            if (b.userData.blockType !== 'water' && b.position.y > highestY) highestY = b.position.y;
        }
    }
    return highestY;
}

// =========================================================================
// 3. SPECIAL EFFECTS PIPELINE
// =========================================================================
function spawnBlockBreakParticles(x, y, z, colorHex) {
    const count = 5; 
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat); p.position.set(x, y, z);
        scene.add(p);
        particleSystems.push({ mesh: p, type: 'shard', vx: (Math.random()-0.5)*0.06, vy: 0.06 + Math.random()*0.06, vz: (Math.random()-0.5)*0.06, life: 1.0 });
    }
}

function spawnSmokeParticle(x, y, z, color = 0x9ca3af) {
    if (particleSystems.length > 30) return; 
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
    const p = new THREE.Mesh(geo, mat); p.position.set(x, y + 0.2, z);
    scene.add(p);
    particleSystems.push({ mesh: p, type: 'smoke', vx: (Math.random()-0.5)*0.01, vy: 0.01, vz: (Math.random()-0.5)*0.01, life: 1.0 });
}

function spawnJumpBlastRing(px, py, pz) {
    const ringSegments = 8; 
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for(let i=0; i<ringSegments; i++) {
        const ang = (i / ringSegments) * Math.PI * 2;
        const p = new THREE.Mesh(geo, mat); p.position.set(px, py - 0.5, pz);
        scene.add(p);
        particleSystems.push({ mesh: p, type: 'blast', vx: Math.cos(ang)*0.1, vy: 0.01, vz: Math.sin(ang)*0.1, life: 1.0 });
    }
}

function updateParticles() {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const p = particleSystems[i];
        if (p.type === 'shard') { p.vy -= 0.006; p.life -= 0.04; }
        else if (p.type === 'smoke') { p.mesh.scale.addScalar(0.01); p.life -= 0.02; }
        else if (p.type === 'blast') { p.mesh.scale.addScalar(0.015); p.life -= 0.05; }
        
        p.mesh.position.x += p.vx; p.mesh.position.y += p.vy; p.mesh.position.z += p.vz;
        if (p.mesh.material) p.mesh.material.opacity = p.life * (p.type === 'smoke' ? 0.4 : p.type === 'blast' ? 0.5 : 1.0);
        if (p.life <= 0) { scene.remove(p.mesh); particleSystems.splice(i, 1); }
    }
}

// =========================================================================
// 4. ITEM / HAND HELD EQUIPMENT
// =========================================================================
const axeGroup = new THREE.Group();
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
blade.position.set(0, 0.18, -0.03); axeGroup.add(blade);
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0x78350f }));
handle.position.set(0, 0.03, 0); axeGroup.add(handle);
axeGroup.scale.set(0.6, 0.6, 0.6); axeGroup.position.set(0.38, -0.38, -0.5);
camera.add(axeGroup); scene.add(camera);

let axeSwingTimer = 0, isAxeSwinging = false;
function triggerAxeSwingAnimation() { if (!isAxeSwinging) { isAxeSwinging = true; axeSwingTimer = 0; } }
function updateAxeAnimationLoop() {
    if (!isAxeSwinging) { axeGroup.position.lerp(new THREE.Vector3(0.38, -0.38, -0.5), 0.15); axeGroup.rotation.set(0, Math.PI / 4, 0); return; }
    axeSwingTimer += 0.25; if (axeSwingTimer >= Math.PI) { isAxeSwinging = false; return; }
    const f = Math.sin(axeSwingTimer); axeGroup.position.z = -0.5 - (f * 0.12); axeGroup.rotation.x = -f * 1.3;
}

// =========================================================================
// 5. THE 6 DETAILED STRATEGIC SAFETY FIREPITS
// =========================================================================
function buildFirepit(cx, cz) {
    const cy = getGroundYAt(cx, cz) + 1; const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), materials.coal); group.add(base);
    
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.15), logMat); log1.position.y = 0.1; group.add(log1);

    const fireMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.8 }));
    fireMesh.position.y = 0.25; group.add(fireMesh);
    group.position.set(cx, cy - 0.4, cz); scene.add(group);
    
    const pLight = new THREE.PointLight(0xf97316, 0, 11, 1.5); pLight.position.set(cx, cy + 0.3, cz); scene.add(pLight);
    firepitsArray.push({ mesh: group, fire: fireMesh, light: pLight, x: cx, y: cy, z: cz, smokeTimer: 0 });
}

function updateFirepitsLoop() {
    firepitsArray.forEach(f => {
        const pulse = 1.0 + Math.sin(Date.now() * 0.004) * 0.1;
        f.fire.scale.set(pulse, pulse, pulse);
        f.smokeTimer += 1; if (f.smokeTimer % 30 === 0) spawnSmokeParticle(f.x, f.y, f.z);
        
        const dx = camera.position.x - f.x; const dz = camera.position.z - f.z; const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 1.1 && Math.abs(camera.position.y - f.y) < 1.5) {
            playerVelocityY = 0.12; camera.position.x += Math.sign(dx) * 0.2; camera.position.z += Math.sign(dz) * 0.2;
            playSound('jump2');
        }
    });
}

// =========================================================================
// 6. NIGHT ZOMBIE HUNTING & FIREPIT REPELLENT ARTIFICIAL INTELLIGENCE
// =========================================================================
function buildZombieMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.35), materials.zombieShirt); body.position.y = 0.35; group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), materials.zombieSkin); head.position.y = 0.9; group.add(head);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), materials.zombieSkin); arm.position.set(0.3, 0.55, -0.2); group.add(arm);
    const armL = arm.clone(); armL.position.x = -0.3; group.add(armL);
    return group;
}

function manageZombieSpawnsAndSunburns() {
    if (currentDayFactor < 0.35) {
        if (activeZombies.length < 8 && Math.random() > 0.96) { 
            const rx = 5 + Math.random() * (WORLD_SIZE - 10); const rz = 5 + Math.random() * (WORLD_SIZE - 10);
            let safe = true; firepitsArray.forEach(f => { if(Math.sqrt(Math.pow(rx-f.x,2)+Math.pow(rz-f.z,2)) < 11) safe = false; });
            if (safe) {
                const ry = getGroundYAt(rx, rz); const zm = buildZombieMesh(); zm.position.set(rx, ry, rz); scene.add(zm);
                activeZombies.push({ mesh: zm, x: rx, z: rz, y: ry, hitpoints: 2 });
            }
        }
    } else {
        for (let i = activeZombies.length - 1; i >= 0; i--) {
            const z = activeZombies[i]; spawnSmokeParticle(z.mesh.position.x, z.mesh.position.y + 0.4, z.mesh.position.z, 0xff5500);
            scene.remove(z.mesh); activeZombies.splice(i, 1);
        }
    }
}

function updateZombiesLoop() {
    const Z_SPEED = 0.032;
    activeZombies.forEach(z => {
        let dx = camera.position.x - z.mesh.position.x; let dz = camera.position.z - z.mesh.position.z;
        let pDist = Math.sqrt(dx*dx + dz*dz);

        let nearFire = null;
        firepitsArray.forEach(f => { if (Math.sqrt(Math.pow(z.mesh.position.x-f.x,2)+Math.pow(z.mesh.position.z-f.z,2)) < 11) nearFire = f; });

        if (nearFire) {
            let fdx = z.mesh.position.x - nearFire.x; let fdz = z.mesh.position.z - nearFire.z;
            let ang = Math.atan2(fdz, fdx);
            z.mesh.position.x += Math.cos(ang) * Z_SPEED * 1.25; z.mesh.position.z += Math.sin(ang) * Z_SPEED * 1.25;
            z.mesh.rotation.y = -ang + Math.PI/2;
        } else if (pDist < 24) {
            let ang = Math.atan2(dz, dx);
            z.mesh.position.x += Math.cos(ang) * Z_SPEED; z.mesh.position.z += Math.sin(ang) * Z_SPEED;
            z.mesh.rotation.y = -ang - Math.PI/2;

            if (pDist < 1.2 && Math.abs(camera.position.y - (z.mesh.position.y + 1)) < 1.3) {
                playSound('hurt'); playerVelocityY = 0.05;
                camera.position.x += Math.cos(ang) * 0.6; camera.position.z += Math.sin(ang) * 0.6;
            }
        }
        z.mesh.position.y = getGroundYAt(z.mesh.position.x, z.mesh.position.z);
    });
}

// =========================================================================
// 7. DECORATIVE FAUNA / ANIMALS ENGINE
// =========================================================================
function spawnAnimals() {
    for (let i = 0; i < 6; i++) {
        const rx = 8 + Math.random() * (WORLD_SIZE - 16); const rz = 8 + Math.random() * (WORLD_SIZE - 16);
        const ry = getGroundYAt(rx, rz) + 0.25;
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), body.material); head.position.set(0, 0.2, -0.25);
        group.add(body); group.add(head); group.position.set(rx, ry, rz); scene.add(group);
        activeAnimals.push({ mesh: group, moveTimer: Math.random()*3, vx: 0, vz: 0 });
    }
}
function updateAnimalsLoop() {
    activeAnimals.forEach(a => {
        a.moveTimer -= 0.016;
        if (a.moveTimer <= 0) {
            a.moveTimer = 2 + Math.random()*3;
            if (Math.random() > 0.4) {
                const ang = Math.random() * Math.PI * 2; a.vx = Math.cos(ang)*0.02; a.vz = Math.sin(ang)*0.02; a.mesh.rotation.y = -ang;
            } else { a.vx = 0; a.vz = 0; }
        }
        a.mesh.position.x = Math.max(2, Math.min(WORLD_SIZE-2, a.mesh.position.x + a.vx));
        a.mesh.position.z = Math.max(2, Math.min(WORLD_SIZE-2, a.mesh.position.z + a.vz));
        a.mesh.position.y = getGroundYAt(a.mesh.position.x, a.mesh.position.z) + 0.2;
    });
}

// =========================================================================
// 8. PROCEDURAL WORLD SCENERY AND SWIMMING POOL ARRANGEMENTS
// =========================================================================
function spawnTree(tx, tz) {
    const sy = getGroundYAt(tx, tz) + 1;
    for (let h = 0; h < 3; h++) createBlock(tx, sy + h, tz, 'wood');
    for (let lx = -1; lx <= 1; lx++) { for (let lz = -1; lz <= 1; lz++) { createBlock(tx + lx, sy + 3, tz + lz, 'leaves'); } }
}

function generateDefaultWorld() {
    clearCurrentWorld(); scene.fog = new THREE.FogExp2(0x87CEEB, 0.012);
    
    // Balanced Pool Settings placed centered on the 80x80 layout
    const pX = 50, pZ = 50, pRad = 6;

    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const distToPool = Math.sqrt(Math.pow(x - pX, 2) + Math.pow(z - pZ, 2));
            const isPool = distToPool < pRad;
            const isFenceLine = (Math.abs(distToPool - (pRad + 1.5)) < 0.5);

            createBlock(x, 0, z, 'stone', true);
            if (isPool) {
                createBlock(x, 1, z, 'water');
            } else {
                createBlock(x, 1, z, 'grass');
                if (isFenceLine && (x % 2 === 0 || z % 2 === 0)) {
                    createBlock(x, 2, z, 'fence');
                }
            }
        }
    }
    
    // Core Map Perimeters
    for (let i = 0; i < WORLD_SIZE; i++) {
        createBlock(i, getGroundYAt(i, 0) + 1, 0, 'fence'); createBlock(i, getGroundYAt(i, WORLD_SIZE - 1) + 1, WORLD_SIZE - 1, 'fence');
        createBlock(0, getGroundYAt(0, i) + 1, i, 'fence'); createBlock(WORLD_SIZE - 1, getGroundYAt(WORLD_SIZE - 1, i) + 1, i, 'fence');
    }

    // Distribute Entities across the full 80x80 map grid
    spawnTree(15, 20); spawnTree(65, 18); spawnTree(20, 60); spawnTree(60, 62);
    
    // 6 Performance Distributed Firepits
    buildFirepit(20, 20); buildFirepit(60, 20);
    buildFirepit(20, 60); buildFirepit(60, 60);
    buildFirepit(40, 35); buildFirepit(35, 45);

    spawnAnimals(); camera.position.set(WORLD_SIZE / 2, 4.5, WORLD_SIZE - 6);
}

// =========================================================================
// 9. HOTBAR MANAGEMENT PORTAL
// =========================================================================
window.selectSlot = function(type) {
    currentSelectedType = type; playSound('ui');
    document.querySelectorAll('.hotbar-slot').forEach(slot => slot.classList.remove('active-slot'));
    const slotEl = document.getElementById(`slot-${type}`); if (slotEl) slotEl.classList.add('active-slot');
};

// =========================================================================
// 10. INPUT LOOK LOOK & MOBILE SPRINT CONTROLLERS
// =========================================================================
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0, isDraggingCamera = false;
function getEventCoords(e) { return e.touches && e.touches.length > 0 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }; }

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone') || e.target.closest('#right-action-column')) return;
    initAudio(); isDraggingCamera = true; const c = getEventCoords(e); lastTrackX = c.x; lastTrackY = c.y;
}
function moveTracking(e) {
    if (!isDraggingCamera) return; const c = getEventCoords(e);
    const dx = c.x - lastTrackX; const dy = c.y - lastTrackY; lastTrackX = c.x; lastTrackY = c.y;
    euler.setFromQuaternion(camera.quaternion); euler.y -= dx * 0.005; euler.x -= dy * 0.005;
    euler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, euler.x));
    camera.quaternion.setFromEuler(euler);
}
document.addEventListener('touchstart', startTracking, { passive: true }); document.addEventListener('touchmove', moveTracking, { passive: true });
document.addEventListener('touchend', () => isDraggingCamera = false); document.addEventListener('mousedown', startTracking);
document.addEventListener('mousemove', moveTracking); document.addEventListener('mouseup', () => isDraggingCamera = false);

const moveDirections = { forward: false, backward: false, left: false, right: false };
let isSprintingActive = false; let lastDpadClickTime = 0;

function bindDpadDirection(id, flag) {
    const el = document.getElementById(id);
    const press = (e) => {
        e.preventDefault(); initAudio();
        const currentTime = Date.now();
        if(flag === 'forward' && (currentTime - lastDpadClickTime < 240)) { isSprintingActive = true; }
        if(flag === 'forward') lastDpadClickTime = currentTime;
        moveDirections[flag] = true;
    };
    const release = () => { moveDirections[flag] = false; if(flag === 'forward') isSprintingActive = false; };
    el.addEventListener('touchstart', press); el.addEventListener('touchend', release);
    el.addEventListener('mousedown', press); el.addEventListener('mouseup', release); el.addEventListener('mouseleave', release);
}
bindDpadDirection('dpad-up', 'forward'); bindDpadDirection('dpad-down', 'backward');
bindDpadDirection('dpad-left', 'left'); bindDpadDirection('dpad-right', 'right');

// =========================================================================
// 11. COMBO TRIPLE JUMP PHYSICAL PIPELINES
// =========================================================================
let playerVelocityY = 0, remainingJumpsCount = 3; 
const GRAVITY_CONSTANT = 0.009, FORCE_JUMP = 0.165, FLOOR_LEVEL_HEIGHT = 4.5;
let wasPlayerInAir = false;

function triggerJumpAction(e) {
    if (e) e.preventDefault(); initAudio();
    if (camera.position.y === FLOOR_LEVEL_HEIGHT) {
        playerVelocityY = FORCE_JUMP; remainingJumpsCount = 2; playSound('jump1'); wasPlayerInAir = true;
    } else if (remainingJumpsCount === 2) {
        playerVelocityY = FORCE_JUMP * 0.95; remainingJumpsCount = 1; playSound('jump2');
    } else if (remainingJumpsCount === 1) {
        playerVelocityY = FORCE_JUMP * 1.1; remainingJumpsCount = 0; playSound('jump1');
        spawnJumpBlastRing(camera.position.x, camera.position.y, camera.position.z);
    }
}
document.getElementById('jump-pad').addEventListener('touchstart', triggerJumpAction);
document.getElementById('jump-pad').addEventListener('mousedown', triggerJumpAction);

function processPhysicsPipeline() {
    playerVelocityY -= GRAVITY_CONSTANT; camera.position.y += playerVelocityY;
    
    if (camera.position.y <= FLOOR_LEVEL_HEIGHT) {
        camera.position.y = FLOOR_LEVEL_HEIGHT; playerVelocityY = 0; remainingJumpsCount = 3;
        if(wasPlayerInAir) {
            wasPlayerInAir = false;
            for(let i=0; i<3; i++) spawnSmokeParticle(camera.position.x, FLOOR_LEVEL_HEIGHT - 1.5, camera.position.z);
        }
    }
}

// =========================================================================
// 12. RAYCAST INTERFACES
// =========================================================================
const raycaster = new THREE.Raycaster(); const screenCenter = new THREE.Vector2(0, 0);

function handleBlockAction(isPlacement) {
    raycaster.setFromCamera(screenCenter, camera);
    if (!isPlacement) triggerAxeSwingAnimation();

    if (!isPlacement) {
        const meshes = activeZombies.map(z => z.mesh.children[0]); 
        const intersects = raycaster.intersectObjects(meshes);
        if (intersects.length > 0 && intersects[0].distance < 6) {
            const torso = intersects[0].object; const zombie = activeZombies.find(z => z.mesh === torso.parent);
            if (zombie) {
                playSound('break'); zombie.hitpoints -= 1;
                spawnBlockBreakParticles(zombie.mesh.position.x, zombie.mesh.position.y+0.4, zombie.mesh.position.z, 0x16a34a);
                if (zombie.hitpoints <= 0) {
                    playSound('death'); scene.remove(zombie.mesh); activeZombies = activeZombies.filter(z => z !== zombie);
                }
                return;
            }
        }
    }

    const intersects = raycaster.intersectObjects(activeBlocks);
    if (intersects.length > 0 && intersects[0].distance < 7) {
        const block = intersects[0].object; if (block.userData.blockType === 'water') return;
        if (!isPlacement) {
            playSound('break');
            spawnBlockBreakParticles(block.position.x, block.position.y, block.position.z, 0x557a2b);
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

// =========================================================================
// 13. SNAPSHOT SAVES
// =========================================================================
window.saveWorld = function() {
    playSound('ui'); const data = activeBlocks.map(b => ({ x: b.position.x, y: b.position.y, z: b.position.z, type: b.userData.blockType }));
    localStorage.setItem('nickcraft_v6_save', JSON.stringify(data)); alert('Optimized World Saved!');
};
window.loadWorld = function() {
    playSound('ui'); const data = localStorage.getItem('nickcraft_v6_save'); if (!data) return alert('No save file found!');
    clearCurrentWorld(); JSON.parse(data).forEach(b => createBlock(b.x, b.y, b.z, b.type)); alert('Optimized World Loaded!');
};

// =========================================================================
// 14. TICK RUN TIME TICK ANIMATION LOOP
// =========================================================================
function animate() {
    requestAnimationFrame(animate);
    
    const speed = isSprintingActive ? 0.18 : 0.10;
    const targetFOV = isSprintingActive ? 82 : 75;
    if(camera.fov !== targetFOV) { camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.2); camera.updateProjectionMatrix(); }
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); forward.y = 0; forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();

    if (moveDirections.forward) camera.position.addScaledVector(forward, speed);
    if (moveDirections.backward) camera.position.addScaledVector(forward, -speed);
    if (moveDirections.left) camera.position.addScaledVector(right, -speed);
    if (moveDirections.right) camera.position.addScaledVector(right, speed);

    camera.position.x = Math.max(1.2, Math.min(WORLD_SIZE - 2.2, camera.position.x));
    camera.position.z = Math.max(1.2, Math.min(WORLD_SIZE - 2.2, camera.position.z));

    processPhysicsPipeline(); updateAxeAnimationLoop(); updateAnimalsLoop(); updateZombiesLoop(); updateFirepitsLoop(); updateParticles(); updateDayNightCycle();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
generateDefaultWorld(); animate();