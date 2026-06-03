// =========================================================================
// 1. SETUP ENGINE & SCENE
// =========================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
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
const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x557a2b }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x866043 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x808080 })
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
let activeBlocks = []; 
let currentSelectedType = 'grass'; 

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
    mesh.userData = { blockType: type };
    scene.add(mesh);
    activeBlocks.push(mesh);
}

function clearCurrentWorld() {
    activeBlocks.forEach(block => scene.remove(block));
    activeBlocks = [];
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
    camera.position.set(WORLD_SIZE / 2, 5, WORLD_SIZE / 2);
}

generateDefaultWorld();

// =========================================================================
// 4. CONTROLS, POINTER LOCK & INPUTS
// =========================================================================
let isLocked = false;

renderer.domElement.addEventListener('click', () => {
    if (!isLocked) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
});

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= movementX * 0.002;
    euler.x -= movementY * 0.002;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    camera.quaternion.setFromEuler(euler);
});

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

window.setBlockType = function(type) {
    currentSelectedType = type;
};

// =========================================================================
// 5. BLOCK BUILDING & BREAKING
// =========================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); 

document.addEventListener('mousedown', (event) => {
    if (!isLocked) return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(activeBlocks);

    if (intersects.length > 0 && intersects[0].distance < 6) { 
        const hitBlock = intersects[0].object;
        if (event.button === 0) {
            scene.remove(hitBlock);
            activeBlocks = activeBlocks.filter(b => b !== hitBlock);
        } else if (event.button === 2) {
            const normal = intersects[0].face.normal;
            const newX = Math.round(hitBlock.position.x + normal.x);
            const newY = Math.round(hitBlock.position.y + normal.y);
            const newZ = Math.round(hitBlock.position.z + normal.z);
            createBlock(newX, newY, newZ, currentSelectedType);
        }
    }
});

window.addEventListener('contextmenu', e => e.preventDefault());

// =========================================================================
// 6. SAVE & LOAD SYSTEM
// =========================================================================
window.saveWorld = function() {
    const saveData = activeBlocks.map(block => ({
        x: block.position.x,
        y: block.position.y,
        z: block.position.z,
        type: block.userData.blockType
    }));
    localStorage.setItem('nickcraft_savegame', JSON.stringify(saveData));
    alert('Nickcraft World Saved Locally!');
};

window.loadWorld = function() {
    const savedData = localStorage.getItem('nickcraft_savegame');
    if (!savedData) {
        alert('No saved world found!');
        return;
    }
    clearCurrentWorld();
    const blocksToLoad = JSON.parse(savedData);
    blocksToLoad.forEach(b => createBlock(b.x, b.y, b.z, b.type));
    alert('Nickcraft World Loaded!');
};

// =========================================================================
// 7. PHYSICS & GAME LOOP
// =========================================================================
let velocityY = 0;
const GRAVITY = 0.01;
const JUMP_FORCE = 0.18;
const SPEED = 0.1;

function animate() {
    requestAnimationFrame(animate);

    const changeX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const changeZ = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; 
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    camera.position.addScaledVector(forward, changeZ * SPEED);
    camera.position.addScaledVector(right, changeX * SPEED);

    const playerFeet = camera.position.y - 1.5; 
    if (playerFeet > 2.5) { 
        velocityY -= GRAVITY; 
    } else {
        velocityY = 0;
        camera.position.y = 4.0; 
        if (keys.space && isLocked) {
            velocityY = JUMP_FORCE; 
        }
    }
    camera.position.y += velocityY;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();