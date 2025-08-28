import type { Sketch, SketchSettings } from "ssam";
import { ssam } from "ssam";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Fn, normalLocal, positionLocal, vec4, vec3, vec2, positionWorld, mix, smoothstep, cameraProjectionMatrix, modelViewMatrix, uniform, distance, texture, uv, screenUV, varying, float, cos } from "three/tsl";
import * as THREE from 'three'
import {
  BoxGeometry,
  Color,
  Mesh,
  NodeMaterial,
  PerspectiveCamera,
  Scene,
  WebGPURenderer,
} from "three/webgpu";
import model from '../original.glb?url'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TrailCanvas } from './trail.js';

const sketch: Sketch<"webgpu"> = async ({
  wrap,
  canvas,
  width,
  height,
  pixelRatio,
}) => {
  if (import.meta.hot) {
    import.meta.hot.dispose(() => wrap.dispose());
    import.meta.hot.accept(() => wrap.hotReload());
  }

  const renderer = new WebGPURenderer({ canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(new Color(0x000000), 1);
  await renderer.init();

  const raycaster = new THREE.Raycaster();

  const camera = new PerspectiveCamera(30, width / height, 0.1, 100);
  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);

  const stats = new Stats();
  document.body.appendChild(stats.dom);

  const scene = new Scene();

  // START OF CODE
  //  =================================

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/');

  const materials = [];

  const trail = new TrailCanvas(width, height);

  let canv = trail.canvas;
  canv.style.position = 'absolute';
  canv.style.top = '0';
  canv.style.left = '0';
  canv.style.zIndex = '1000';
  canv.style.width = '200px';
  canv.style.height = `${200 * height / width}px`;
  document.body.appendChild(canv);

  let trailTexture = new THREE.Texture(trail.getTexture());
  trailTexture.flipY = false;
  trailTexture.needsUpdate = true;

  const mouse = new THREE.Vector3();
  const mouse2D = new THREE.Vector2();
  const uMouse = uniform(mouse, 'vec3');

  const dummyMaterial = new NodeMaterial();
  dummyMaterial.colorNode = vec4(0, 1, 0, 1);
  let dummy = new THREE.Mesh(new THREE.PlaneGeometry(19, 19), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
  document.addEventListener('mousemove', (e) => {
    let mouseX = (e.clientX / width) * 2 - 1;
    let mouseY = -(e.clientY / height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const intersects = raycaster.intersectObjects([dummy]);
    mouse2D.set(e.clientX, e.clientY);
    if (intersects.length > 0) {
      uMouse.value.copy(intersects[0].point);
    }
  });

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(model, (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh && !child.userData.scaled) {
        child.scale.multiplyScalar(1.01);
        child.userData.scaled = true;
      }
    });

    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        let material = new NodeMaterial();
        let texture1 = child.material.map;
        let texture2 = child.material.emissiveMap;
        let uvscreen = varying(vec2(0., 0.));

        const palette = Fn(({ t, a, b, c, d }) => {
          return a.add(b.mul(cos(float(6.283185).mul(c.mul(t).add(d)))))
        });

        const sRGBTransferEOTF = Fn(([color]) => {
          const a = color.pow(0.41666).mul(1.055).sub(0.055);
          const b = color.mul(12.92);
          const factor = color.lessThanEqual(0.0031308);
          const rgbResult = mix(a, b, factor);
          return rgbResult;
        })

        material.positionNode = Fn(() => {
          const pos = positionLocal;
          const ndc = cameraProjectionMatrix.mul(modelViewMatrix).mul(vec4(pos, 1.));
          uvscreen.assign(ndc.xy.div(ndc.w).add(1.).div(2.));
          uvscreen.y = uvscreen.y.oneMinus();

          const extrude = texture(trailTexture, uvscreen).r;

          pos.z.mulAssign(mix(1, 1.3, extrude));
          // return pos.add(normalLocal.mul(mix(0.0, 0.3, extrude)));

          return pos;
        })();
        material.colorNode = Fn(() => {
          const dist = distance(positionWorld, uMouse);
          const tt1 = sRGBTransferEOTF(texture(texture1, uv()));
          const tt2 = sRGBTransferEOTF(texture(texture2, uv()));
          const extrude = texture(trailTexture, screenUV);
          let level0 = smoothstep(0.0, 0.6, tt2.b);
          material.colorNode = Fn(() => {
            const tt2 = sRGBTransferEOTF(texture(texture2, uv()));; // visualize blue channel
          })();
          let level1 = tt2.g;
          let level2 = tt2.r;
          let level3 = tt1.b;
          let level4 = tt1.g;
          let level5 = tt1.r;
          let final = vec3(0.545, 0.545, 0.545);
          final = mix(final, level1, smoothstep(0.1, 0.2, extrude));
          final = mix(final, level2, smoothstep(0.2, 0.4, extrude));
          final = mix(final, level3, smoothstep(0.4, 0.6, extrude));
          final = mix(final, level4, smoothstep(0.6, 0.8, extrude));
          final = mix(final, level5, smoothstep(0.8, 1., extrude));

          return vec4(final);
        })();
        child.material = material;
        materials.push(material);
      }
    });
    model.position.set(0, 2, 0);
    scene.add(model);
  });




  // ==================================

  wrap.render = ({ playhead }) => {

    trail.update(mouse2D);
    trailTexture.needsUpdate = true;

    controls.update();
    stats.update();
    renderer.render(scene, camera);
  };

  wrap.resize = ({ width, height }) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  wrap.unload = () => {
    renderer.dispose();
    materials.forEach(m => m.dispose());
  };
};

const settings: SketchSettings = {
  mode: "webgpu",
  // dimensions: [800, 800],
  pixelRatio: window.devicePixelRatio,
  animate: true,
  duration: 6_000,
  playFps: 60,
  exportFps: 60,
  framesFormat: ["mp4"],
};


ssam(sketch, settings);
