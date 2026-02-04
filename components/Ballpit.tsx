import { useRef, useEffect } from 'react';
import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  SRGBColorSpace,
  MathUtils,
  Vector2,
  Vector3,
  MeshPhysicalMaterial,
  ShaderChunk,
  Color,
  Object3D,
  InstancedMesh,
  PMREMGenerator,
  SphereGeometry,
  AmbientLight,
  PointLight,
  ACESFilmicToneMapping,
  Raycaster,
  Plane,
  Matrix4,
  Quaternion,
  Euler
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface RenderManagerState {
  elapsed: number;
  delta: number;
}

interface RenderManagerSize {
  width: number;
  height: number;
  wWidth: number;
  wHeight: number;
  ratio: number;
  pixelRatio: number;
}

class RenderManager {
  #params: any;
  canvas: HTMLElement | null = null;
  camera: PerspectiveCamera = new PerspectiveCamera();
  cameraMinAspect: number | undefined;
  cameraMaxAspect: number | undefined;
  cameraFov: number;
  maxPixelRatio: number | undefined;
  minPixelRatio: number | undefined;
  scene: Scene = new Scene();
  renderer: WebGLRenderer | undefined;
  #postprocessing: any;
  size: RenderManagerSize = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#internalRender;
  onBeforeRender: (state: RenderManagerState) => void = () => {};
  onAfterRender: (state: RenderManagerState) => void = () => {};
  onAfterResize: (size: RenderManagerSize) => void = () => {};
  #visible = false;
  #animating = false;
  isDisposed = false;
  #observer: IntersectionObserver | undefined;
  #resizeObserver: ResizeObserver | undefined;
  #resizeTimeout: any;
  #clock = new Clock();
  #state: RenderManagerState = { elapsed: 0, delta: 0 };
  #animationFrameId: number | undefined;

  constructor(params: any) {
    this.#params = { ...params };
    this.#setupCamera();
    this.#setupScene();
    this.#setupRenderer();
    this.resize();
    this.#setupListeners();
  }

  #setupCamera() {
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  #setupScene() {
    this.scene = new Scene();
  }

  #setupRenderer() {
    if (this.#params.canvas) {
      this.canvas = this.#params.canvas;
    } else if (this.#params.id) {
      this.canvas = document.getElementById(this.#params.id);
    } else {
      console.error('Three: Missing canvas or id parameter');
      return;
    }
    
    if (this.canvas) {
        this.canvas.style.display = 'block';
        const options = {
          canvas: this.canvas,
          powerPreference: 'high-performance',
          ...(this.#params.rendererOptions ?? {})
        };
        this.renderer = new WebGLRenderer(options);
        this.renderer.outputColorSpace = SRGBColorSpace;
    }
  }

  #setupListeners() {
    if (!this.canvas) return;

    if (!(this.#params.size instanceof Object)) {
      window.addEventListener('resize', this.#handleResize.bind(this));
      if (this.#params.size === 'parent' && this.canvas.parentNode) {
        this.#resizeObserver = new ResizeObserver(this.#handleResize.bind(this));
        this.#resizeObserver.observe(this.canvas.parentNode as Element);
      }
    }
    this.#observer = new IntersectionObserver(this.#handleVisibility.bind(this), {
      root: null,
      rootMargin: '0px',
      threshold: 0
    });
    this.#observer.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#handleDocumentVisibility.bind(this));
  }

  #removeListeners() {
    window.removeEventListener('resize', this.#handleResize.bind(this));
    this.#resizeObserver?.disconnect();
    this.#observer?.disconnect();
    document.removeEventListener('visibilitychange', this.#handleDocumentVisibility.bind(this));
  }

  #handleVisibility(entries: IntersectionObserverEntry[]) {
    this.#visible = entries[0].isIntersecting;
    this.#visible ? this.#start() : this.#stop();
  }

  #handleDocumentVisibility() {
    if (this.#visible) {
      document.hidden ? this.#stop() : this.#start();
    }
  }

  #handleResize() {
    if (this.#resizeTimeout) clearTimeout(this.#resizeTimeout);
    this.#resizeTimeout = setTimeout(this.resize.bind(this), 100);
  }

  resize() {
    let width, height;
    if (this.#params.size instanceof Object) {
      width = this.#params.size.width;
      height = this.#params.size.height;
    } else if (this.#params.size === 'parent' && this.canvas?.parentNode) {
      width = (this.canvas.parentNode as HTMLElement).offsetWidth;
      height = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.#updateCamera();
    this.#updateRenderer();
    this.onAfterResize(this.size);
  }

  #updateCamera() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.#adjustFov(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.#adjustFov(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  #adjustFov(aspect: number) {
    const t = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / aspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(t));
  }

  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const fov = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(fov / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    } else if ((this.camera as any).isOrthographicCamera) {
      // @ts-ignore
      this.size.wHeight = this.camera.top - this.camera.bottom;
       // @ts-ignore
      this.size.wWidth = this.camera.right - this.camera.left;
    }
  }

  #updateRenderer() {
    this.renderer?.setSize(this.size.width, this.size.height);
    this.#postprocessing?.setSize(this.size.width, this.size.height);
    let pixelRatio = window.devicePixelRatio;
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) {
      pixelRatio = this.maxPixelRatio;
    } else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) {
      pixelRatio = this.minPixelRatio;
    }
    this.renderer?.setPixelRatio(pixelRatio);
    this.size.pixelRatio = pixelRatio;
  }

  get postprocessing() {
    return this.#postprocessing;
  }

  set postprocessing(val) {
    this.#postprocessing = val;
    this.render = val.render.bind(val);
  }

  #start() {
    if (this.#animating) return;
    const animate = () => {
      this.#animationFrameId = requestAnimationFrame(animate);
      this.#state.delta = this.#clock.getDelta();
      this.#state.elapsed += this.#state.delta;
      this.onBeforeRender(this.#state);
      this.render();
      this.onAfterRender(this.#state);
    };
    this.#animating = true;
    this.#clock.start();
    animate();
  }

  #stop() {
    if (this.#animating) {
      if (this.#animationFrameId) cancelAnimationFrame(this.#animationFrameId);
      this.#animating = false;
      this.#clock.stop();
    }
  }

  #internalRender() {
    if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
    }
  }

  clear() {
    this.scene.traverse((obj: any) => {
      if (obj.isMesh && typeof obj.material === 'object' && obj.material !== null) {
        Object.keys(obj.material).forEach(prop => {
          const materialProp = obj.material[prop];
          if (materialProp !== null && typeof materialProp === 'object' && typeof materialProp.dispose === 'function') {
            materialProp.dispose();
          }
        });
        obj.material.dispose();
        obj.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    this.#removeListeners();
    this.#stop();
    this.clear();
    this.#postprocessing?.dispose();
    this.renderer?.dispose();
    this.isDisposed = true;
  }
}

const touchHandlers = new Map();
const touchPosition = new Vector2();
let touchListenersAdded = false;

function createTouchHandler(config: any) {
  const handler = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter(h: any) {},
    onMove(h: any) {},
    onClick(h: any) {},
    onLeave(h: any) {},
    ...config
  };

  if (!touchHandlers.has(config.domElement)) {
    touchHandlers.set(config.domElement, handler);
    if (!touchListenersAdded) {
      document.body.addEventListener('pointermove', handlePointerMove);
      document.body.addEventListener('pointerleave', handlePointerLeave);
      document.body.addEventListener('click', handleClick);

      document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.body.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.body.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      touchListenersAdded = true;
    }
  }

  handler.dispose = () => {
    const el = config.domElement;
    touchHandlers.delete(el);
    if (touchHandlers.size === 0) {
      document.body.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerleave', handlePointerLeave);
      document.body.removeEventListener('click', handleClick);

      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', handleTouchEnd);
      document.body.removeEventListener('touchcancel', handleTouchEnd);

      touchListenersAdded = false;
    }
  };
  return handler;
}

function handlePointerMove(e: PointerEvent) {
  touchPosition.x = e.clientX;
  touchPosition.y = e.clientY;
  processInteraction();
}

function processInteraction() {
  for (const [elem, handler] of touchHandlers) {
    const rect = elem.getBoundingClientRect();
    if (isInside(rect)) {
      updateHandlerPosition(handler, rect);
      if (!handler.hover) {
        handler.hover = true;
        handler.onEnter(handler);
      }
      handler.onMove(handler);
    } else if (handler.hover && !handler.touching) {
      handler.hover = false;
      handler.onLeave(handler);
    }
  }
}

function handleClick(e: MouseEvent) {
  touchPosition.x = e.clientX;
  touchPosition.y = e.clientY;
  for (const [elem, handler] of touchHandlers) {
    const rect = elem.getBoundingClientRect();
    updateHandlerPosition(handler, rect);
    if (isInside(rect)) handler.onClick(handler);
  }
}

function handlePointerLeave() {
  for (const handler of touchHandlers.values()) {
    if (handler.hover) {
      handler.hover = false;
      handler.onLeave(handler);
    }
  }
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length > 0) {
    let target = e.target as any;
    if (target.nodeType === 3) { // Handle text nodes
      target = target.parentNode;
    }
    
    // Allow default behavior for buttons and links to ensure clicks work
    // Check if closest exists (it should on Elements) and if we are inside a button/link
    if (target.closest && !target.closest('button') && !target.closest('a')) {
      e.preventDefault();
    }
    touchPosition.x = e.touches[0].clientX;
    touchPosition.y = e.touches[0].clientY;

    for (const [elem, handler] of touchHandlers) {
      const rect = elem.getBoundingClientRect();
      if (isInside(rect)) {
        handler.touching = true;
        updateHandlerPosition(handler, rect);
        if (!handler.hover) {
          handler.hover = true;
          handler.onEnter(handler);
        }
        handler.onMove(handler);
      }
    }
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    e.preventDefault();
    touchPosition.x = e.touches[0].clientX;
    touchPosition.y = e.touches[0].clientY;

    for (const [elem, handler] of touchHandlers) {
      const rect = elem.getBoundingClientRect();
      updateHandlerPosition(handler, rect);

      if (isInside(rect)) {
        if (!handler.hover) {
          handler.hover = true;
          handler.touching = true;
          handler.onEnter(handler);
        }
        handler.onMove(handler);
      } else if (handler.hover && handler.touching) {
        handler.onMove(handler);
      }
    }
  }
}

function handleTouchEnd() {
  for (const [, handler] of touchHandlers) {
    if (handler.touching) {
      handler.touching = false;
      if (handler.hover) {
        handler.hover = false;
        handler.onLeave(handler);
      }
    }
  }
}

function updateHandlerPosition(handler: any, rect: DOMRect) {
  const { position, nPosition } = handler;
  position.x = touchPosition.x - rect.left;
  position.y = touchPosition.y - rect.top;
  nPosition.x = (position.x / rect.width) * 2 - 1;
  nPosition.y = (-position.y / rect.height) * 2 + 1;
}

function isInside(rect: DOMRect) {
  const { x, y } = touchPosition;
  const { left, top, width, height } = rect;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

const { randFloat, randFloatSpread } = MathUtils;
const vec3A = new Vector3();
const vec3B = new Vector3();
const vec3C = new Vector3();
const vec3D = new Vector3();
const vec3E = new Vector3();
const vec3F = new Vector3();
const vec3G = new Vector3();
const vec3H = new Vector3();
const vec3I = new Vector3();
const vec3J = new Vector3();

class Physics {
  config: any;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center: Vector3;

  constructor(config: any) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new Vector3();
    this.#initializePositions();
    this.setSizes();
  }

  #initializePositions() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const s = 3 * i;
      positionData[s] = randFloatSpread(2 * config.maxX);
      positionData[s + 1] = randFloatSpread(2 * config.maxY);
      positionData[s + 2] = randFloatSpread(2 * config.maxZ);
    }
  }

  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) {
      sizeData[i] = randFloat(config.minSize, config.maxSize);
    }
  }

  update(state: { delta: number }) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let startIdx = 0;
    if (config.controlSphere0) {
      startIdx = 1;
      vec3A.fromArray(positionData, 0);
      vec3A.lerp(center, 0.1).toArray(positionData, 0);
      vec3D.set(0, 0, 0).toArray(velocityData, 0);
    }
    for (let idx = startIdx; idx < config.count; idx++) {
      const base = 3 * idx;
      vec3B.fromArray(positionData, base);
      vec3E.fromArray(velocityData, base);
      vec3E.y -= state.delta * config.gravity * sizeData[idx];
      vec3E.multiplyScalar(config.friction);
      vec3E.clampLength(0, config.maxVelocity);
      vec3B.add(vec3E);
      vec3B.toArray(positionData, base);
      vec3E.toArray(velocityData, base);
    }
    for (let idx = startIdx; idx < config.count; idx++) {
      const base = 3 * idx;
      vec3B.fromArray(positionData, base);
      vec3E.fromArray(velocityData, base);
      const radius = sizeData[idx];
      for (let jdx = idx + 1; jdx < config.count; jdx++) {
        const otherBase = 3 * jdx;
        vec3C.fromArray(positionData, otherBase);
        vec3F.fromArray(velocityData, otherBase);
        const otherRadius = sizeData[jdx];
        vec3G.copy(vec3C).sub(vec3B);
        const dist = vec3G.length();
        const sumRadius = radius + otherRadius;
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          vec3H.copy(vec3G)
            .normalize()
            .multiplyScalar(0.5 * overlap);
          vec3I.copy(vec3H).multiplyScalar(Math.max(vec3E.length(), 1));
          vec3J.copy(vec3H).multiplyScalar(Math.max(vec3F.length(), 1));
          vec3B.sub(vec3H);
          vec3E.sub(vec3I);
          vec3B.toArray(positionData, base);
          vec3E.toArray(velocityData, base);
          vec3C.add(vec3H);
          vec3F.add(vec3J);
          vec3C.toArray(positionData, otherBase);
          vec3F.toArray(velocityData, otherBase);
        }
      }
      if (config.controlSphere0) {
        vec3G.copy(vec3A).sub(vec3B);
        const dist = vec3G.length();
        const sumRadius0 = radius + sizeData[0];
        if (dist < sumRadius0) {
          const diff = sumRadius0 - dist;
          vec3H.copy(vec3G.normalize()).multiplyScalar(diff);
          vec3I.copy(vec3H).multiplyScalar(Math.max(vec3E.length(), 2));
          vec3B.sub(vec3H);
          vec3E.sub(vec3I);
        }
      }
      if (Math.abs(vec3B.x) + radius > config.maxX) {
        vec3B.x = Math.sign(vec3B.x) * (config.maxX - radius);
        vec3E.x = -vec3E.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(vec3B.y) + radius > config.maxY) {
          vec3B.y = Math.sign(vec3B.y) * (config.maxY - radius);
          vec3E.y = -vec3E.y * config.wallBounce;
        }
      } else if (vec3B.y - radius < -config.maxY) {
        vec3B.y = -config.maxY + radius;
        vec3E.y = -vec3E.y * config.wallBounce;
      }
      const maxBoundary = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(vec3B.z) + radius > maxBoundary) {
        vec3B.z = Math.sign(vec3B.z) * (config.maxZ - radius);
        vec3E.z = -vec3E.z * config.wallBounce;
      }
      vec3B.toArray(positionData, base);
      vec3E.toArray(velocityData, base);
    }
  }
}

class BallpitMaterial extends MeshPhysicalMaterial {
  uniforms: { [key: string]: { value: any } };
  onBeforeCompile2?: (shader: any) => void;

  constructor(parameters: any) {
    super(parameters);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    this.defines = { USE_UV: '' };
    this.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        '\n        uniform float thicknessPower;\n        uniform float thicknessScale;\n        uniform float thicknessDistortion;\n        uniform float thicknessAmbient;\n        uniform float thicknessAttenuation;\n      ' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        '\n        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {\n          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));\n          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;\n          #ifdef USE_COLOR\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;\n          #else\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;\n          #endif\n          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;\n        }\n\n        void main() {\n      '
      );
      const lightingChunk = ShaderChunk.lights_fragment_begin.split(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );'
      ).join(
        '\n          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);\n        '
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', lightingChunk);
      if (this.onBeforeCompile2) this.onBeforeCompile2(shader);
    };
  }
}

const defaultConfig = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 16777215,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const dummyObject = new Object3D();

class BallpitInstances extends InstancedMesh {
  config: any;
  physics: Physics;
  ambientLight: AmbientLight;
  light: PointLight;

  constructor(renderer: WebGLRenderer, options: any = {}) {
    const config = { ...defaultConfig, ...options };
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(envScene).texture;
    envScene.dispose();
    
    const geometry = new SphereGeometry();
    const material = new BallpitMaterial({ envMap, ...config.materialParams });
    
    // Safety check for envMapRotation
    // @ts-ignore
    if (material.envMapRotation) {
        // @ts-ignore
        material.envMapRotation.x = -Math.PI / 2;
    }
    
    super(geometry, material, config.count);
    this.config = config;
    this.physics = new Physics(config);
    this.ambientLight = new AmbientLight(config.ambientColor, config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new PointLight(config.colors[0], config.lightIntensity);
    this.add(this.light);
    
    this.#setupLighting();
    this.setColors(config.colors);
  }

  #setupLighting() {
    // Already done in constructor, but separated for clarity in original code structure
  }

  setColors(colors: any[]) {
    if (Array.isArray(colors) && colors.length > 1) {
      const gradient = (function (colors) {
        let currentColors: Color[] = [];
        
        function updateColors(newColors: any[]) {
          currentColors = [];
          newColors.forEach(col => {
            currentColors.push(new Color(col));
          });
        }
        updateColors(colors);
        return {
          updateColors,
          getColorAt: function (ratio: number, out = new Color()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (currentColors.length - 1);
            const idx = Math.floor(scaled);
            const start = currentColors[idx];
            if (idx >= currentColors.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = currentColors[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          }
        };
      })(colors);

      for (let idx = 0; idx < this.count; idx++) {
        this.setColorAt(idx, gradient.getColorAt(idx / this.count));
        if (idx === 0) {
          this.light.color.copy(gradient.getColorAt(idx / this.count));
        }
      }
      if (this.instanceColor) this.instanceColor.needsUpdate = true;
    }
  }

  update(state: { delta: number }) {
    this.physics.update(state);
    for (let idx = 0; idx < this.count; idx++) {
      dummyObject.position.fromArray(this.physics.positionData, 3 * idx);
      if (idx === 0 && this.config.followCursor === false) {
        dummyObject.scale.setScalar(0);
      } else {
        dummyObject.scale.setScalar(this.physics.sizeData[idx]);
      }
      dummyObject.updateMatrix();
      this.setMatrixAt(idx, dummyObject.matrix);
      if (idx === 0) this.light.position.copy(dummyObject.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

function createBallpit(canvas: HTMLElement, options: any = {}) {
  const manager = new RenderManager({
    canvas: canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  
  let ballpit: BallpitInstances | null = null;
  
  if (manager.renderer) {
      manager.renderer.toneMapping = ACESFilmicToneMapping;
  }
  
  manager.camera.position.set(0, 0, 20);
  manager.camera.lookAt(0, 0, 0);
  manager.cameraMaxAspect = 1.5;
  manager.resize();
  
  initialize(options);
  
  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersectPoint = new Vector3();
  let paused = false;

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  // @ts-ignore
  canvas.style.webkitUserSelect = 'none';

  const touchHandler = createTouchHandler({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(touchHandler.nPosition, manager.camera);
      manager.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectPoint);
      if (ballpit) {
        ballpit.physics.center.copy(intersectPoint);
        ballpit.config.controlSphere0 = true;
      }
    },
    onLeave() {
      if (ballpit) ballpit.config.controlSphere0 = false;
    }
  });

  function initialize(opts: any) {
    if (ballpit) {
      manager.clear();
      manager.scene.remove(ballpit);
    }
    if (manager.renderer) {
        ballpit = new BallpitInstances(manager.renderer, opts);
        manager.scene.add(ballpit);
    }
  }

  manager.onBeforeRender = (state) => {
    if (!paused && ballpit) ballpit.update(state);
  };

  manager.onAfterResize = (size) => {
    if (ballpit) {
        ballpit.config.maxX = size.wWidth / 2;
        ballpit.config.maxY = size.wHeight / 2;
    }
  };

  return {
    three: manager,
    get spheres() {
      return ballpit;
    },
    setCount(count: number) {
      if (ballpit) initialize({ ...ballpit.config, count: count });
    },
    togglePause() {
      paused = !paused;
    },
    dispose() {
      touchHandler.dispose();
      manager.dispose();
    }
  };
}

const Ballpit = ({ className = '', followCursor = true, ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spheresInstanceRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    spheresInstanceRef.current = createBallpit(canvas, { followCursor, ...props });

    return () => {
      if (spheresInstanceRef.current) {
        spheresInstanceRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas className={className} ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default Ballpit;