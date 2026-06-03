// =========================================================================
// 0. COMPREHENSIVE NICKCRAFT AUDIO SYNTH ENGINE
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
        osc.type = 'square'; osc.frequency.setValueAtTime(65 + Math.random() * 35, now);
        gainNode.gain.setValueAtTime(0.06, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now); osc.stop(now + 0.04);
    } else if (type === 'ui') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(0.05, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    }
}

// =========================================================================
// 1. SCENE SETUP & EXTENDED ENVIRONMENT CYCLE Engine
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
sunLight.position.set(60, 100, 30);
sunLight.castShadow = true;
scene.add(sunLight);

let worldTime = 0; 
function updateDayNightCycle() {
    worldTime += 0.001; // Slower time step for longer day cycles
    const dayFactor = (Math.sin(worldTime) + 1) / 2; 
    
    const skyColor = new THREE.Color(0x0a0d1a).lerp(new THREE.Color(0x87CEEB), dayFactor);
    scene.background = skyColor;
    if (scene.fog) scene.fog.color = skyColor;
    
    ambientLight.intensity = 0.15 + (dayFactor * 0.55);
    sunLight.intensity = dayFactor * 0.7;
    sunLight.position.x = Math.cos(worldTime) * 90;
    sunLight.position.y = Math.sin(worldTime) * 90;

    const nightIntensity = (1.0 - dayFactor) * 2.0;
    firepitsArray.forEach(f => { f.light.intensity = nightIntensity; });
}

// =========================================================================
// 2. VOXEL BLOCK GENERATION AND TEXTURING
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
    coal: new THREE.MeshStandardMaterial({ map: createVoxelTexture('#2d2d2d', '#1a1a1a', 'noise') }),
    logo: new THREE.MeshBasicMaterial({ color: 0xffffff })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; let activeAnimals = []; let firepitsArray = []; let particleSystems = [];
let currentSelectedType = 'grass';

// 1.5x Bigger World Expansion Dimension Maps
const WORLD_SIZE = 72; 

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
// 3. SPECIAL EFFECT PARTICLES PIPELINE (SHARDS, SMOKE, BLAST RINGS)
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
    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.4 });
    const p = new THREE.Mesh(geo, mat); p.position.set(x + (Math.random()-0.5)*0.3, y + 0.3, z + (Math.random()-0.5)*0.3);
    scene.add(p);
    particleSystems.push({ mesh: p, type: 'smoke', vx: (Math.random()-0.5)*0.01, vy: 0.015 + Math.random()*0.015, vz: (Math.random()-0.5)*0.01, life: 1.0 });
}

function spawnJumpBlastRing(px, py, pz) {
    const ringSegments = 16;
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    for(let i=0; i<ringSegments; i++) {
        const ang = (i / ringSegments) * Math.PI * 2;
        const p = new THREE.Mesh(geo, mat); p.position.set(px, py - 0.5, pz);
        scene.add(p);
        particleSystems.push({ mesh: p, type: 'blast', vx: Math.cos(ang)*0.12, vy: 0.01, vz: Math.sin(ang)*0.12, life: 1.0 });
    }
}

function updateParticles() {
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const p = particleSystems[i];
        if (p.type === 'shard') { p.vy -= 0.006; p.life -= 0.025; }
        else if (p.type === 'smoke') { p.mesh.scale.addScalar(0.012); p.life -= 0.012; }
        else if (p.type === 'blast') { p.mesh.scale.addScalar(0.02); p.life -= 0.04; }
        
        p.mesh.position.x += p.vx; p.mesh.position.y += p.vy; p.mesh.position.z += p.vz;
        if (p.mesh.material) p.mesh.material.opacity = p.life * (p.type === 'smoke' ? 0.4 : p.type === 'blast' ? 0.6 : 1.0);
        
        if (p.life <= 0) { scene.remove(p.mesh); particleSystems.splice(i, 1); }
    }
}

// =========================================================================
// 4. DOWNSIZED WEAPON EQUIPMENT ENGINE
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
// 5. 4 SLOW FLARE FLICKERING DETAILED FIREPITS
// =========================================================================
function buildFirepit(cx, cz) {
    const cy = getGroundYAt(cx, cz) + 1; const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 1.3), materials.coal); base.castShadow = true; base.receiveShadow = true; group.add(base);
    
    const logMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const log1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.2), logMat); log1.position.y = 0.15; log1.rotation.y = 0.4; group.add(log1);
    const log2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.2), logMat); log2.position.y = 0.22; log2.rotation.y = -0.6; group.add(log2);

    const fireGeo = new THREE.BoxGeometry(0.55, 0.5, 0.55);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.85 });
    const fireMesh = new THREE.Mesh(fireGeo, fireMat); fireMesh.position.y = 0.35; group.add(fireMesh);
    group.position.set(cx, cy - 0.4, cz); scene.add(group);
    
    const pLight = new THREE.PointLight(0xf97316, 0, 12, 1.5); pLight.position.set(cx, cy + 0.5, cz); scene.add(pLight);
    firepitsArray.push({ mesh: group, fire: fireMesh, light: pLight, x: cx, y: cy, z: cz, smokeTimer: 0 });
}

function updateFirepitsLoop() {
    firepitsArray.forEach(f => {
        const timeRef = Date.now();
        const pulseY = 1.0 + Math.sin(timeRef * 0.003) * 0.12;
        const pulseXZ = 0.9 + Math.cos(timeRef * 0.002) * 0.08;
        f.fire.scale.set(pulseXZ, pulseY, pulseXZ);
        
        if (Math.random() > 0.93) {
            f.fire.material.color.setHex(Math.random() > 0.4 ? 0xf97316 : 0xef4444);
            if (Math.random() > 0.8) playSound('crackle');
        }
        f.smokeTimer += 1; if (f.smokeTimer % 22 === 0) spawnSmokeParticle(f.x, f.y, f.z);
        
        const dx = camera.position.x - f.x; const dz = camera.position.z - f.z; const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < 1.1 && Math.abs(camera.position.y - f.y) < 1.8) {
            playerVelocityY = 0.13; camera.position.x += (dx === 0 ? 0.2 : Math.sign(dx) * 0.22); camera.position.z += (dz === 0 ? 0.2 : Math.sign(dz) * 0.22);
            playSound('jump2');
        }
    });
}

// =========================================================================
// 6. PROCEDURAL VOXEL SKY LOGO GENERATOR
// =========================================================================
const NICKCRAFT_MATRIX = {
    'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'C': [[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'K': [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
    'R': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
    'A': [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
    'F': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
    'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]]
};
function generateSkyLogoText() {
    const logoGroup = new THREE.Group();
    const sequence = ['N','I','C','K','C','R','A','F','T'];
    let currentStartX = 0;
    
    sequence.forEach(char => {
        const schema = NICKCRAFT_MATRIX[char];
        if(!schema) return;
        const rows = schema.length;
        for(let r=0; r<rows; r++) {
            for(let c=0; c<schema[r].length; c++) {
                if(schema[r][c] === 1) {
                    // Render blocks upside down relative to loop layout array matrices
                    const block = new THREE.Mesh(blockGeometry, materials.logo);
                    block.position.set(currentStartX + c, (rows - r), 0);
                    block.castShadow = true; logoGroup.add(block);
                }
            }
        }
        currentStartX += schema[0].length + 2; // Spacing between individual character modules
    });
    
    // Scale logo up significantly and center it over the middle of the expanded board
    logoGroup.scale.set(2.2, 2.2, 2.2);
    logoGroup.position.set(WORLD_SIZE / 2 - 50, 42, WORLD_SIZE / 2);
    scene.add(logoGroup);
}

// =========================================================================
// 7. ANIMALS SYSTEM
// =========================================================================
const animalConfig = [
    { type: 'horse', color: 0x5c2d17, size: [0.7, 0.8, 1.1], count: 2 },
    { type: 'dog', color: 0xc2410c, size: [0.4, 0.45, 0.65], count: 3 },
    { type: 'cat', color: 0xd97706, size: [0.3, 0.3, 0.45], count: 3 },
    { type: 'pig', color: 0xf472b6, size: [0.5, 0.5, 0.75], count: 5 }
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
            const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), bodyMat); head.position.set(0, cfg.size[1]*0.4, -cfg.size[2]*0.45); head.castShadow = true; group.add(head);
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
                const dx = (WORLD_SIZE/2) - a.mesh.position.x; const dz = (WORLD_SIZE/2) - a.mesh.position.z;
                const angle = Math.atan2(dz, dx) + (Math.random() - 0.5);
                a.vx = Math.cos(angle) * 0.025; a.vz = Math.sin(angle) * 0.025; a.mesh.rotation.y = -angle + Math.PI/2;
            } else if (a.type === 'horse' && Math.random() > 0.75) {
                a.vx = 0; a.vz = 0; const hx = Math.round(a.mesh.position.x); const hz = Math.round(a.mesh.position.z);
                activeBlocks.forEach(b => { if (Math.round(b.position.x) === hx && Math.round(b.position.z) === hz && b.userData.blockType === 'grass') { b.material = materials.dirt; b.userData.blockType = 'dirt'; } });
            } else if (Math.random() > 0.3) {
                const angle = Math.random() * Math.PI * 2; a.vx = Math.cos(angle) * 0.03; a.vz = Math.sin(angle) * 0.03; a.mesh.rotation.y = -angle + Math.PI/2;
            } else { a.vx = 0; a.vz = 0; }
        }
        a.mesh.position.x += a.vx; a.mesh.position.z += a.vz;
        a.mesh.position.x = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.x)); a.mesh.position.z = Math.max(2, Math.min(WORLD_SIZE - 2, a.mesh.position.z));
        a.mesh.position.y = getGroundYAt(a.mesh.position.x, a.mesh.position.z) + 0.5 + a.bY;
    });
}

// =========================================================================
// 8. 1.5x WORLD LANDSCAPE ARCHITECTURE
// =========================================================================
function spawnTree(trunkX, trunkZ, customHeight = 4) {
    const surfaceY = getGroundYAt(trunkX, trunkZ); const startY = surfaceY + 1;
    for (let h = 0; h < customHeight; h++) createBlock(trunkX, startY + h, trunkZ, 'wood');
    const leafHeight = startY + customHeight;
    for (let lx = -1; lx <= 1; lx++) { for (let lz = -1; lz <= 1; lz++) { createBlock(trunkX + lx, leafHeight - 1, trunkZ + lz, 'leaves'); createBlock(trunkX + lx, leafHeight, trunkZ + lz, 'leaves'); } }
    createBlock(trunkX, leafHeight + 1, trunkZ, 'leaves');
}

function generateDefaultWorld() {
    clearCurrentWorld(); scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);
    const hillCenterX = Math.floor(WORLD_SIZE * 0.25), hillCenterZ = Math.floor(WORLD_SIZE * 0.3);
    const puddleCenterX = Math.floor(WORLD_SIZE * 0.6), puddleCenterZ = Math.floor(WORLD_SIZE * 0.6);

    for (let x = 0; x < WORLD_SIZE; x++) {
        for (let z = 0; z < WORLD_SIZE; z++) {
            const distToHill = Math.sqrt(Math.pow(x - hillCenterX, 2) + Math.pow(z - hillCenterZ, 2));
            let hillHeight = 0; if (distToHill < 12) hillHeight = Math.round((12 - distToHill) * 0.5);
            const distToPuddle = Math.sqrt(Math.pow(x - puddleCenterX, 2) + Math.pow(z - puddleCenterZ, 2));
            const isPuddle = distToPuddle < 8;

            createBlock(x, 0, z, 'stone');
            if (isPuddle) {
                createBlock(x, 1, z, 'stone'); createBlock(x, 2, z, 'water');
            } else {
                createBlock(x, 1, z, 'dirt'); createBlock(x, 2, z, 'grass');
                for (let h = 0; h < hillHeight; h++) createBlock(x, 3 + h, z, (h === hillHeight - 1) ? 'grass' : 'dirt');
            }
        }
    }
    
    // Perimeter fences
    for (let i = 0; i < WORLD_SIZE; i++) {
        createBlock(i, getGroundYAt(i, 0) + 1, 0, 'fence'); createBlock(i, getGroundYAt(i, WORLD_SIZE - 1) + 1, WORLD_SIZE - 1, 'fence');
        createBlock(0, getGroundYAt(0, i) + 1, i, 'fence'); createBlock(WORLD_SIZE - 1, getGroundYAt(WORLD_SIZE - 1, i) + 1, i, 'fence');
    }

    // Natural Foliage Layout Distributes
    spawnTree(12, 26, 4); spawnTree(Math.floor(WORLD_SIZE*0.8), 20, 4); spawnTree(hillCenterX, hillCenterZ+1, 5); spawnTree(25, Math.floor(WORLD_SIZE*0.7), 3);
    spawnTree(45, 18, 4); spawnTree(18, 52, 5);

    // Quad distribution firepits
    buildFirepit(Math.floor(WORLD_SIZE*0.3), Math.floor(WORLD_SIZE*0.3));
    buildFirepit(Math.floor(WORLD_SIZE*0.7), Math.floor(WORLD_SIZE*0.25));
    buildFirepit(Math.floor(WORLD_SIZE*0.25), Math.floor(WORLD_SIZE*0.7));
    buildFirepit(Math.floor(WORLD_SIZE*0.75), Math.floor(WORLD_SIZE*0.75));

    // Mount giant 3D title text logo in the sky
    generateSkyLogoText();

    spawnAnimals(); camera.position.set(WORLD_SIZE / 2, 4.5, WORLD_SIZE - 6);
}

// =========================================================================
// 9. HOTBAR MANAGEMENT CONNECTIONS
// =========================================================================
window.selectSlot = function(type) {
    currentSelectedType = type; playSound('ui');
    document.querySelectorAll('.hotbar-slot').forEach(slot => slot.classList.remove('active-slot'));
    const slotEl = document.getElementById(`slot-${type}`); if (slotEl) slotEl.classList.add('active-slot');
};

// =========================================================================
// 10. INPUT MANAGERS (DOUBLE TAP SPRINTING & CROSS LOOKS)
// =========================================================================
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
let lastTrackX = 0, lastTrackY = 0, isDraggingCamera = false;
function getEventCoords(e) { return e.touches && e.touches.length > 0 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY }; }

function startTracking(e) {
    if (e.target.closest('#menu') || e.target.closest('.touch-zone') || e.target.closest('#right-cluster')) return;
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
let isSprintingActive = false; let lastDpadClickTime = 0;

function bindDpadDirection(id, flag) {
    const el = document.getElementById(id);
    const press = (e) => {
        e.preventDefault(); initAudio();
        const currentTime = Date.now();
        // Check for quick double taps within 250 milliseconds to activate sprinting fields
        if(flag === 'forward' && (currentTime - lastDpadClickTime < 250)) { isSprintingActive = true; }
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
// 11. ADVANCED TRIPLE JUMP PHYSICS ENVIRONMENT
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
        // Third Combo Jump: Blast out smoke rings beneath feet!
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
        // Hit the ground landing effects particle triggers
        if(wasPlayerInAir) {
            wasPlayerInAir = false;
            for(let i=0; i<6; i++) spawnSmokeParticle(camera.position.x, FLOOR_LEVEL_HEIGHT - 1.5, camera.position.z);
        }
    }
}

// =========================================================================
// 12. ACTION ACTIONS
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
// 13. DATA STORAGE
// =========================================================================
window.saveWorld = function() {
    playSound('ui'); const data = activeBlocks.map(b => ({ x: b.position.x, y: b.position.y, z: b.position.z, type: b.userData.blockType }));
    localStorage.setItem('nickcraft_v4_save', JSON.stringify(data)); alert('Nickcraft Data Backup Created!');
};
window.loadWorld = function() {
    playSound('ui'); const data = localStorage.getItem('nickcraft_v4_save'); if (!data) return alert('No snapshot record found!');
    clearCurrentWorld(); JSON.parse(data).forEach(b => createBlock(b.x, b.y, b.z, b.type)); alert('Nickcraft Data Backup Restored!');
};

// =========================================================================
// 14. MASTER TICK FRAME LOOP
// =========================================================================
function animate() {
    requestAnimationFrame(animate);
    
    // Calculate current running modifier constants
    const currentMoveSpeed = isSprintingActive ? 0.20 : 0.11;
    
    // Dynamic FOV shift effect for high-speed sprinting feedback
    const targetFOV = isSprintingActive ? 84 : 75;
    if(camera.fov !== targetFOV) { camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.15); camera.updateProjectionMatrix(); }
    
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); forwardVec.y = 0; forwardVec.normalize();
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); rightVec.y = 0; rightVec.normalize();

    if (moveDirections.forward) camera.position.addScaledVector(forwardVec, currentMoveSpeed);
    if (moveDirections.backward) camera.position.addScaledVector(forwardVec, -currentMoveSpeed);
    if (moveDirections.left) camera.position.addScaledVector(rightVec, -currentMoveSpeed);
    if (moveDirections.right) camera.position.addScaledVector(rightVec, currentMoveSpeed);

    // Dynamic camera safety boundaries for the expanded map
    camera.position.x = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.x));
    camera.position.z = Math.max(1.5, Math.min(WORLD_SIZE - 2.5, camera.position.z));

    processPhysicsPipeline(); updateAxeAnimationLoop(); updateAnimalsLoop(); updateFirepitsLoop(); updateParticles(); updateDayNightCycle();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
generateDefaultWorld(); animate();