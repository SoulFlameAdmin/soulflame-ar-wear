import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101219);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(0, 0.2, 5.4);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 3.3;
controls.maxDistance = 7;
controls.target.set(0, 0.1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x20242d, 2.3));
const keyLight = new THREE.DirectionalLight(0xffffff, 4.3);
keyLight.position.set(3, 4, 4);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xff6a3d, 2.4);
rimLight.position.set(-4, 1, -3);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.1, 64),
  new THREE.MeshStandardMaterial({ color: 0x151821, roughness: 0.95, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.72;
scene.add(floor);

const mannequin = new THREE.Group();
scene.add(mannequin);

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7180, roughness: 0.85 });
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.72, 8, 20), bodyMaterial);
body.scale.set(0.95, 1, 0.58);
body.position.y = -0.08;
mannequin.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 32), bodyMaterial);
head.position.y = 1.55;
mannequin.add(head);

function createArm(x) {
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 1.55, 6, 16), bodyMaterial);
  arm.rotation.z = x > 0 ? -0.18 : 0.18;
  arm.position.set(x, 0.08, 0);
  return arm;
}
mannequin.add(createArm(-0.82), createArm(0.82));

const shirtMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x171922,
  roughness: 0.62,
  metalness: 0.05,
  sheen: 0.8,
  sheenColor: new THREE.Color(0xff6a3d),
  side: THREE.DoubleSide
});

function createShirt() {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 1.55, 48, 1, true), shirtMaterial);
  torso.scale.z = 0.67;
  torso.position.y = 0.25;
  group.add(torso);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.83, 48, 20, 0, Math.PI * 2, 0.48, 1.7), shirtMaterial);
  shoulder.scale.set(1.12, 0.48, 0.66);
  shoulder.position.y = 0.86;
  group.add(shoulder);

  const sleeveGeometry = new THREE.CylinderGeometry(0.24, 0.29, 0.72, 28, 1, true);
  const leftSleeve = new THREE.Mesh(sleeveGeometry, shirtMaterial);
  leftSleeve.rotation.z = -1.18;
  leftSleeve.position.set(-0.83, 0.75, 0);
  group.add(leftSleeve);
  const rightSleeve = leftSleeve.clone();
  rightSleeve.rotation.z = 1.18;
  rightSleeve.position.x = 0.83;
  group.add(rightSleeve);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.045, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0x242733, roughness: 0.7 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.13, 0.16);
  group.add(collar);

  return group;
}

let garment = createShirt();
mannequin.add(garment);

const sizeScale = { XS: 0.87, S: 0.92, M: 0.97, L: 1.02, XL: 1.09, XXL: 1.16 };
let selectedSize = 'L';

function applyGarmentScale(size) {
  const scale = sizeScale[size] || 1;
  garment.scale.set(scale, 1 + (scale - 1) * 0.45, scale);
}
applyGarmentScale(selectedSize);

function recommendSize(chest) {
  if (chest < 84) return 'XS';
  if (chest < 92) return 'S';
  if (chest < 100) return 'M';
  if (chest < 108) return 'L';
  if (chest < 118) return 'XL';
  return 'XXL';
}

function updateFit() {
  const chest = Number(document.querySelector('#chest').value || 102);
  const waist = Number(document.querySelector('#waist').value || 88);
  const recommended = recommendSize(chest);
  document.querySelector('#recommendedSize').textContent = recommended;

  const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const distance = Math.abs(order.indexOf(selectedSize) - order.indexOf(recommended));
  const score = Math.max(68, 96 - distance * 11 - Math.max(0, waist - chest + 18) * 0.25);
  document.querySelector('#fitScore').textContent = `${Math.round(score)}%`;

  let message = 'Добро прилягане и балансирана свобода на движение.';
  if (distance === 1) message = selectedSize < recommended ? 'Ще стои по-вталено и може да опъва при движение.' : 'Ще стои по-свободно, особено около талията.';
  if (distance >= 2) message = selectedSize < recommended ? 'Този размер вероятно ще бъде прекалено тесен.' : 'Този размер вероятно ще бъде прекалено широк.';
  document.querySelector('#fitMessage').textContent = message;
}

document.querySelectorAll('#sizePicker button').forEach((button) => {
  button.addEventListener('click', () => {
    selectedSize = button.dataset.size;
    document.querySelectorAll('#sizePicker button').forEach((item) => item.classList.toggle('active', item === button));
    applyGarmentScale(selectedSize);
    updateFit();
  });
});

document.querySelectorAll('#height,#weight,#chest,#waist').forEach((input) => input.addEventListener('input', updateFit));

document.querySelector('#resetView').addEventListener('click', () => {
  camera.position.set(0, 0.2, 5.4);
  controls.target.set(0, 0.1, 0);
  controls.update();
});

document.querySelector('#cameraMode').addEventListener('click', () => {
  const notice = document.querySelector('#notice');
  notice.textContent = 'AR камерата ще използва MediaPipe body tracking във v0.2. 3D пробната вече работи.';
});

document.querySelector('#modelUpload').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    mannequin.remove(garment);
    garment = gltf.scene;
    garment.position.set(0, 0, 0);
    garment.scale.setScalar(1);
    garment.traverse((child) => {
      if (child.isMesh) child.material.side = THREE.DoubleSide;
    });
    mannequin.add(garment);
    document.querySelector('#notice').textContent = `${file.name} е зареден успешно. Използвай размера за скалиране.`;
    applyGarmentScale(selectedSize);
    URL.revokeObjectURL(url);
  }, undefined, () => {
    document.querySelector('#notice').textContent = 'Моделът не можа да се зареди. Използвай валиден GLB/GLTF файл.';
    URL.revokeObjectURL(url);
  });
});

function resize() {
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
updateFit();

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
