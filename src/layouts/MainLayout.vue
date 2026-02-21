<template>
  <q-layout view="hHh lpR fFf" class="vibey-layout" @mousemove="handleMouseMove">
    <!-- Interactive Universe Background -->
    <div class="interactive-bg">
      <div
        class="spotlight"
        :style="{ transform: `translate(${mouseX}px, ${mouseY}px)` }"
      ></div>
      <div class="grid-overlay"></div>

      <!-- 3D Canvas -->
      <canvas ref="canvasRef" class="three-canvas"></canvas>
    </div>

    <!-- Main Content Container -->
    <q-page-container class="content-wrapper">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import * as THREE from 'three';

const auth = useAuthStore();
const mouseX = ref(-500); // Start off-screen
const mouseY = ref(-500);
const canvasRef = ref(null);

let targetMouseX = 0;
let targetMouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

const handleMouseMove = (e) => {
  // Center the 800x800 spotlight around the cursor
  mouseX.value = e.clientX - 400;
  mouseY.value = e.clientY - 400;

  // Normalized coordinates for ThreeJS camera parallax (-1 to 1)
  targetMouseX = (e.clientX - windowHalfX) * 0.001;
  targetMouseY = (e.clientY - windowHalfY) * 0.001;
};

// --- ThreeJS Setup ---
let scene, camera, renderer, particles, shapes = [];

function initThree() {
  if (!canvasRef.value) return;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 1. Create Particle Field (Stars/Dust)
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 1200;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 600;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x8b5cf6, // Purple
    size: 0.8,
    transparent: true,
    opacity: 0.6,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // 2. Create Floating Wireframe Shapes (Hadathala)
  const geometries = [
    new THREE.IcosahedronGeometry(6, 0),
    new THREE.OctahedronGeometry(8, 0),
    new THREE.TetrahedronGeometry(10, 0),
    new THREE.DodecahedronGeometry(7, 0)
  ];

  const material = new THREE.MeshBasicMaterial({
    color: 0x06b6d4, // Cyan
    wireframe: true,
    transparent: true,
    opacity: 0.25,
  });

  const shapeCount = 35;
  for (let i = 0; i < shapeCount; i++) {
    const geo = geometries[Math.floor(Math.random() * geometries.length)];
    const mesh = new THREE.Mesh(geo, material);

    // Randomize positions widely around the screen
    mesh.position.x = (Math.random() - 0.5) * 300;
    mesh.position.y = (Math.random() - 0.5) * 300;
    mesh.position.z = (Math.random() - 0.5) * 200;

    // Randomize rotation speeds and floating velocities
    mesh.userData = {
      rx: (Math.random() - 0.5) * 0.01,
      ry: (Math.random() - 0.5) * 0.01,
      rz: (Math.random() - 0.5) * 0.01,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      vz: (Math.random() - 0.5) * 0.2,
    };

    shapes.push(mesh);
    scene.add(mesh);
  }

  // Handle window resize
  window.addEventListener('resize', onWindowResize);

  animate();
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // Slowly rotate the particle universe like a galaxy
  particles.rotation.z -= 0.0005;
  particles.rotation.x += 0.0002;

  // Float and rotate individual shapes
  shapes.forEach(shape => {
    // Rotation
    shape.rotation.x += shape.userData.rx;
    shape.rotation.y += shape.userData.ry;
    shape.rotation.z += shape.userData.rz;

    // Floating translation
    shape.position.x += shape.userData.vx;
    shape.position.y += shape.userData.vy;
    shape.position.z += shape.userData.vz;

    // Bounce off invisible boundaries to keep them within view
    if (shape.position.x > 180 || shape.position.x < -180) shape.userData.vx *= -1;
    if (shape.position.y > 180 || shape.position.y < -180) shape.userData.vy *= -1;
    if (shape.position.z > 100 || shape.position.z < -200) shape.userData.vz *= -1;
  });

  // Parallax mouse effect on camera
  camera.position.x += (targetMouseX * 50 - camera.position.x) * 0.05;
  camera.position.y += (-targetMouseY * 50 - camera.position.y) * 0.05;
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}

onMounted(() => {
  auth.init();
  initThree();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  shapes = [];
  scene = null;
  camera = null;
  renderer = null;
});
</script>

<style lang="scss">
.vibey-layout {
  background-color: #000000;
  overflow: hidden;
  position: relative;
  min-height: 100vh;
}

.interactive-bg {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* 3D Canvas layer */
.three-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 1;
}

/* Glowing orb that follows the mouse */
.spotlight {
  position: absolute;
  top: 0; left: 0;
  width: 800px; height: 800px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.06) 30%, transparent 60%);
  border-radius: 50%;
  pointer-events: none;
  transition: transform 0.1s ease-out;
  will-change: transform;
  z-index: 2; /* Glow stays over 3D objects slightly */
}

/* Modern dashed/dotted grid overlay */
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 3;
  mask-image: radial-gradient(circle at center, black 10%, transparent 85%);
  -webkit-mask-image: radial-gradient(circle at center, black 10%, transparent 85%);
}

.content-wrapper {
  position: relative;
  z-index: 10;
}
</style>
