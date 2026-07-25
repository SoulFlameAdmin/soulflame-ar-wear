import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.178.0/examples/jsm/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const canvas = $('#scene');
const viewer = $('.viewer-card');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101219);
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(0,.15,5.4);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const controls = new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.2;controls.maxDistance=7;controls.target.set(0,.05,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x20242d,2.2));
const key = new THREE.DirectionalLight(0xffffff,4.5);key.position.set(3,4,4);scene.add(key);
const rim = new THREE.DirectionalLight(0xff6a3d,2.5);rim.position.set(-4,1,-3);scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(2.15,64),new THREE.MeshStandardMaterial({color:0x151821,roughness:.95}));
floor.rotation.x=-Math.PI/2;floor.position.y=-1.72;scene.add(floor);

const mannequin = new THREE.Group();scene.add(mannequin);
const bodyMat = new THREE.MeshStandardMaterial({color:0x6b7180,roughness:.82});
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.62,1.72,8,24),bodyMat);torso.position.y=-.08;mannequin.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(.34,32,32),bodyMat);head.position.y=1.55;mannequin.add(head);
const arms=[];
function arm(x){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.15,1.55,6,16),bodyMat);m.rotation.z=x>0?-.18:.18;m.position.set(x,.08,0);arms.push(m);return m}
mannequin.add(arm(-.82),arm(.82));

const garmentMat = new THREE.MeshPhysicalMaterial({color:0x171922,roughness:.62,metalness:.05,sheen:.8,sheenColor:new THREE.Color(0xff6a3d),side:THREE.DoubleSide});
function createShirt(){
 const g=new THREE.Group();
 const t=new THREE.Mesh(new THREE.CylinderGeometry(.72,.78,1.55,48,1,true),garmentMat);t.scale.z=.67;t.position.y=.25;g.add(t);
 const sh=new THREE.Mesh(new THREE.SphereGeometry(.83,48,20,0,Math.PI*2,.48,1.7),garmentMat);sh.scale.set(1.12,.48,.66);sh.position.y=.86;g.add(sh);
 const geo=new THREE.CylinderGeometry(.24,.29,.72,28,1,true);const l=new THREE.Mesh(geo,garmentMat);l.rotation.z=-1.18;l.position.set(-.83,.75,0);g.add(l);const r=l.clone();r.rotation.z=1.18;r.position.x=.83;g.add(r);
 const c=new THREE.Mesh(new THREE.TorusGeometry(.25,.045,12,48),new THREE.MeshStandardMaterial({color:0x242733,roughness:.7}));c.rotation.x=Math.PI/2;c.position.set(0,1.13,.16);g.add(c);return g;
}
let garment=createShirt();mannequin.add(garment);
let selectedSize='L', fitType='regular', autoSpin=false, stream=null, deferredPrompt=null;
const sizeScale={XS:.87,S:.92,M:.97,L:1.02,XL:1.09,XXL:1.16};
const order=['XS','S','M','L','XL','XXL'];
const fabricSettings={cotton:{roughness:.68,metalness:.02,sheen:.55},denim:{roughness:.88,metalness:.01,sheen:.12},silk:{roughness:.25,metalness:.04,sheen:1},leather:{roughness:.38,metalness:.12,sheen:.3},sport:{roughness:.48,metalness:.02,sheen:.75}};
const fitFactors={slim:.94,regular:1,oversize:1.1};

function n(id,fallback){return Number($('#'+id).value||fallback)}
function morphBody(){
 const height=n('height',178),weight=n('weight',78),chest=n('chest',102),waist=n('waist',88),hips=n('hips',100),shoulders=n('shoulders',47),shape=n('bodyShape',0);
 const h=height/178,w=Math.max(.8,Math.min(1.3,weight/78));
 torso.scale.set((chest/102)*(.95+shape*.003),h,(waist/88)*.58*w*.12+.5);
 head.position.y=1.55*h;head.scale.setScalar(.96+h*.04);
 arms.forEach((a,i)=>{a.scale.y=h;a.position.x=(i?1:-1)*(.82*(shoulders/47));});
 mannequin.position.y=(h-1)*.18;
 const hipInfluence=hips/100;floor.scale.setScalar(Math.max(1,hipInfluence*.98));
}
function recommendSize(){const chest=n('chest',102);if(chest<84)return'XS';if(chest<92)return'S';if(chest<100)return'M';if(chest<108)return'L';if(chest<118)return'XL';return'XXL'}
function applyGarment(){const s=sizeScale[selectedSize]*fitFactors[fitType];garment.scale.set(s,1+(s-1)*.45,s);morphBody()}
function updateFit(){
 const chest=n('chest',102),waist=n('waist',88),hips=n('hips',100),rec=recommendSize();
 const dist=Math.abs(order.indexOf(selectedSize)-order.indexOf(rec));
 const fitPenalty=fitType==='slim'?3:fitType==='oversize'?2:0;
 const proportionPenalty=Math.max(0,Math.abs(waist-chest*.86)-10)*.18+Math.max(0,hips-chest-12)*.12;
 const score=Math.max(55,Math.min(98,97-dist*11-fitPenalty-proportionPenalty));
 const ease=Math.round((sizeScale[selectedSize]*chest*1.06*fitFactors[fitType])-chest);
 $('#recommendedSize').textContent=rec;$('#fitScore').textContent=`${Math.round(score)}%`;$('#easeValue').textContent=`${ease} см`;
 $('#fitTitle').textContent=score>=92?'Отлично':score>=82?'Много добро':score>=70?'Приемливо':'Неподходящо';
 let msg='Добро прилягане и балансирана свобода на движение.';
 if(dist===1)msg=order.indexOf(selectedSize)<order.indexOf(rec)?'По-вталено; възможно опъване в гърдите и раменете.':'По-свободна визия с повече място около талията.';
 if(dist>=2)msg=order.indexOf(selectedSize)<order.indexOf(rec)?'Вероятно прекалено тесен размер.':'Вероятно прекалено широк размер.';
 if(fitType==='oversize')msg+=' Oversize кройката добавя обем.';
 $('#fitMessage').textContent=msg;applyGarment();
}
function setView(pos){camera.position.set(...pos);controls.target.set(0,.05,0);controls.update()}
function setMode(mode){
 $$('.mode-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 if(mode==='camera')startCamera();else stopCamera();
}
async function startCamera(){
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});$('#cameraFeed').srcObject=stream;await $('#cameraFeed').play();viewer.classList.add('camera');$('#bodyGuide').hidden=false;$('#viewerBadge').textContent='AR CAMERA';$('#viewerHint').textContent='Подравни тялото в рамката';$('#notice').textContent='Камерата е активна. Следващият слой е автоматично MediaPipe позициониране.'}
 catch(e){$('#notice').textContent='Няма достъп до камерата. Разреши Camera permission в браузъра.';setMode('studio')}
}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}viewer.classList.remove('camera');$('#bodyGuide').hidden=true;$('#viewerBadge').textContent='BODY TWIN';$('#viewerHint').textContent='Завърти с пръст · приближи с два пръста'}
function saveProfile(){const data={};['height','weight','chest','waist','hips','shoulders','bodyShape','fabric','fitType'].forEach(id=>data[id]=$('#'+id).value);data.size=selectedSize;localStorage.setItem('sf-ar-wear-profile',JSON.stringify(data));$('#notice').textContent='Body Twin профилът е запазен на телефона.'}
function loadProfile(){try{const d=JSON.parse(localStorage.getItem('sf-ar-wear-profile'));if(!d)return;Object.entries(d).forEach(([k,v])=>{if($('#'+k))$('#'+k).value=v});if(d.size){selectedSize=d.size;$$('#sizePicker button').forEach(b=>b.classList.toggle('active',b.dataset.size===selectedSize))}fitType=$('#fitType').value;updateMaterial();updateFit()}catch(e){}}
function updateMaterial(){fitType=$('#fitType').value;const s=fabricSettings[$('#fabric').value];Object.assign(garmentMat,s);garmentMat.needsUpdate=true;applyGarment();updateFit()}

$$('#sizePicker button').forEach(b=>b.addEventListener('click',()=>{selectedSize=b.dataset.size;$$('#sizePicker button').forEach(x=>x.classList.toggle('active',x===b));updateFit()}));
$$('.measurements input,#bodyShape').forEach(i=>i.addEventListener('input',()=>{const v=n('bodyShape',0);$('#shapeLabel').textContent=v<-7?'По-фин':v>7?'По-масивен':'Баланс';updateFit()}));
$$('#colorPicker button').forEach(b=>b.addEventListener('click',()=>{$$('#colorPicker button').forEach(x=>x.classList.toggle('active',x===b));garmentMat.color.set(b.dataset.color);garmentMat.needsUpdate=true}));
$('#fabric').addEventListener('change',updateMaterial);$('#fitType').addEventListener('change',updateMaterial);
$('#frontView').addEventListener('click',()=>setView([0,.15,5.4]));$('#sideView').addEventListener('click',()=>setView([5.1,.15,0]));$('#resetView').addEventListener('click',()=>setView([0,.15,5.4]));
$('#autoRotate').addEventListener('click',()=>{autoSpin=!autoSpin;controls.autoRotate=autoSpin;controls.autoRotateSpeed=2;$('#autoRotate').textContent=autoSpin?'Стоп':'360°'});
$$('.mode-tabs button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$('#cameraMode').addEventListener('click',()=>setMode('camera'));$('#saveProfile').addEventListener('click',saveProfile);
$('#modelUpload').addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file);new GLTFLoader().load(url,g=>{mannequin.remove(garment);garment=g.scene;garment.traverse(c=>{if(c.isMesh){c.material.side=THREE.DoubleSide;c.castShadow=true}});mannequin.add(garment);$('#garmentName').textContent=file.name;applyGarment();$('#notice').textContent='3D моделът е зареден успешно.';URL.revokeObjectURL(url)},undefined,()=>{$('#notice').textContent='Невалиден GLB/GLTF файл.';URL.revokeObjectURL(url)})});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();loadProfile();updateMaterial();updateFit();
(function animate(){controls.update();renderer.render(scene,camera);requestAnimationFrame(animate)})();