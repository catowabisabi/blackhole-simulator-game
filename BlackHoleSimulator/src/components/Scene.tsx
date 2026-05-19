import { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Platform, Keyboard, TextInput, Text } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BH_MASS = 12000;
const BH_RADIUS = 22;
const G = 14;
const TAIL = 80;
const BH_POS = new THREE.Vector3();

// Player constants
const PLAYER_INITIAL_MASS = 40;
const PLAYER_INITIAL_RADIUS = 8;
const PLAYER_SPEED = 180;
const PLAYER_BOUNDS = 280;
const PLAYER_HIT_RADIUS = 6;

// Enemy black hole constants
const ENEMY_BH_MASS = 15000;
const ENEMY_BH_RADIUS = 18;
const ENEMY_BH_SPEED = 60;

// Win condition: absorb enough mass
const WIN_MASS_THRESHOLD = 50000;
// Lose condition: hit enemy BH when player is smaller
const LOSE_MASS_RATIO = 1.2;

interface BodyInterface {
  mesh: THREE.Mesh;
  tailObj: THREE.Points;
  tailGeo: THREE.BufferGeometry;
  tailMat: THREE.ShaderMaterial;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  type: string;
  light?: THREE.PointLight;
  glow?: THREE.Sprite;
  alive: boolean;
  tailPts: THREE.Vector3[];
  tailColor: THREE.Color;
  update: (dt: number, bhPos: THREE.Vector3, bhMass: number, bodies: Body[]) => void;
  dispose: (scene: THREE.Scene) => void;
  setTrailColor: (color: THREE.Color) => void;
}

interface EnemyBHInterface {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  alive: boolean;
  update: (dt: number, playerPos: THREE.Vector3) => void;
  dispose: (scene: THREE.Scene) => void;
}

interface PlayerInterface {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  alive: boolean;
  absorbedMass: number;
  mesh?: THREE.Mesh;
  glow?: THREE.Sprite;
  update: (dt: number, keys: { [key: string]: boolean }, enemyBHs: EnemyBH[]) => void;
  dispose: (scene: THREE.Scene) => void;
  grow: (massGain: number) => void;
}

interface SceneState {
  bodyCount: number;
  bhMass: number;
  playerMass: number;
  playerAbsorbed: number;
  gameState: 'idle' | 'playing' | 'won' | 'lost';
  score: number;
}

interface SceneProps {
  simSpeed: number;
  trailColor: string | null;
  onStatsChange: (stats: SceneState) => void;
  onGameStateChange: (state: 'idle' | 'playing' | 'won' | 'lost') => void;
  onPlayerPosChange: (pos: { x: number; y: number }) => void;
}

class OrbitControls {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  dist: number;
  theta: number;
  phi: number;
  drag: boolean;
  prev: { x: number; y: number };

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.dist = 420;
    this.theta = 0.6;
    this.phi = 1.1;
    this.target = new THREE.Vector3();
    this.drag = false;
    this.prev = { x: 0, y: 0 };
    this.update();
  }

  handleStart(x: number, y: number) {
    this.drag = true;
    this.prev = { x, y };
  }

  handleMove(x: number, y: number) {
    if (!this.drag) return;
    this.theta -= (x - this.prev.x) * 0.006;
    this.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this.phi - (y - this.prev.y) * 0.006));
    this.prev = { x, y };
    this.update();
  }

  handleEnd() {
    this.drag = false;
  }

  handleZoom(delta: number) {
    this.dist = Math.max(60, Math.min(1400, this.dist + delta));
    this.update();
  }

  update() {
    const s = Math.sin(this.phi);
    const c = Math.cos(this.phi);
    this.camera.position.set(
      this.target.x + this.dist * s * Math.cos(this.theta),
      this.target.y + this.dist * c,
      this.target.z + this.dist * s * Math.sin(this.theta)
    );
    this.camera.lookAt(this.target);
  }
}

class Body implements BodyInterface {
  mesh: THREE.Mesh;
  tailObj: THREE.Points;
  tailGeo: THREE.BufferGeometry;
  tailMat: THREE.ShaderMaterial;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  type: string;
  light?: THREE.PointLight;
  glow?: THREE.Sprite;
  alive: boolean = true;
  tailPts: THREE.Vector3[] = [];
  tailColor: THREE.Color;

  constructor(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    mass: number, radius: number,
    color: number, type: string = 'planet',
    scene: THREE.Scene
  ) {
    this.mass = mass;
    this.radius = radius;
    this.type = type;
    this.vel = new THREE.Vector3(vx, vy, vz);

    const geo = new THREE.SphereGeometry(radius, 24, 24);
    let mat: THREE.Material;
    let glowSprite: THREE.Sprite | null = null;

    if (type === 'star') {
      mat = new THREE.MeshBasicMaterial({ color });
      this.light = new THREE.PointLight(color, 8, radius * 40);
      scene.add(this.light);

      const glowMat = new THREE.SpriteMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      glowSprite = new THREE.Sprite(glowMat);
      glowSprite.scale.set(radius * 7, radius * 7, 1);
    } else {
      mat = new THREE.MeshPhongMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(0.35),
        shininess: 60,
      });
    }

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    if (glowSprite) {
      this.glow = glowSprite;
      this.mesh.add(this.glow);
    }

    this.tailColor = new THREE.Color().setHSL(Math.random(), 1, 0.6);

    const tg = new THREE.BufferGeometry();
    const positions = new Float32Array(TAIL * 3);
    const alphas = new Float32Array(TAIL);
    tg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    tg.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    tg.setDrawRange(0, 0);
    this.tailGeo = tg;

    this.tailMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: this.tailColor } },
      vertexShader: `
        attribute float alpha;
        varying float vA;
        void main() {
          vA = alpha;
          gl_PointSize = max(1.0, 5.0 * alpha);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(color, vA * (1.0 - d * 2.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.tailObj = new THREE.Points(tg, this.tailMat);
    scene.add(this.tailObj);
  }

  update(dt: number, bhPos: THREE.Vector3, bhMass: number, bodies: Body[]) {
    const diff = bhPos.clone().sub(this.mesh.position);
    const dist = diff.length();
    this.vel.addScaledVector(diff.normalize(), G * bhMass / Math.max(dist * dist, 1) * dt);

    for (const o of bodies) {
      if (o === this || !o.alive) continue;
      const d2 = o.mesh.position.clone().sub(this.mesh.position);
      const d2Len = Math.max(d2.length(), 10);
      this.vel.addScaledVector(d2.normalize(), G * o.mass / (d2Len * d2Len) * dt);
    }

    this.mesh.position.addScaledVector(this.vel, dt);

    if (this.light) {
      this.light.position.copy(this.mesh.position);
    }

    this.tailPts.push(this.mesh.position.clone());
    if (this.tailPts.length > TAIL) {
      this.tailPts.shift();
    }

    const n = this.tailPts.length;
    if (n >= 2) {
      const pa = this.tailGeo.attributes.position.array as Float32Array;
      const aa = this.tailGeo.attributes.alpha.array as Float32Array;
      for (let j = 0; j < n; j++) {
        const p = this.tailPts[j];
        pa[j * 3] = p.x;
        pa[j * 3 + 1] = p.y;
        pa[j * 3 + 2] = p.z;
        aa[j] = j / (n - 1);
      }
      this.tailGeo.attributes.position.needsUpdate = true;
      this.tailGeo.attributes.alpha.needsUpdate = true;
      this.tailGeo.setDrawRange(0, n);
    }
  }

  setTrailColor(color: THREE.Color) {
    this.tailColor.copy(color);
    this.tailMat.uniforms.color.value.copy(color);
  }

  dispose(scene: THREE.Scene) {
    this.alive = false;
    scene.remove(this.mesh);
    scene.remove(this.tailObj);
    this.mesh.geometry.dispose();
    this.tailGeo.dispose();
    this.tailMat.dispose();
    if (this.light) scene.remove(this.light);
    if (this.glow) {
      const mat = this.glow.material as THREE.SpriteMaterial;
      if (mat.map) (mat.map as THREE.Texture).dispose();
      mat.dispose();
    }
  }
}

class EnemyBH implements EnemyBHInterface {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  alive: boolean = true;

  constructor(x: number, y: number, z: number, scene: THREE.Scene) {
    this.mass = ENEMY_BH_MASS;
    this.radius = ENEMY_BH_RADIUS;
    const angle = Math.atan2(z, x);
    this.vel = new THREE.Vector3(
      -Math.sin(angle) * ENEMY_BH_SPEED,
      0,
      Math.cos(angle) * ENEMY_BH_SPEED
    );

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x220033 })
    );
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius * 1.6, 1.0, 8, 60),
      new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      })
    );
    this.ring.rotation.x = Math.PI / 2;
    this.mesh.add(this.ring);
  }

  update(dt: number, playerPos: THREE.Vector3) {
    const toPlayer = playerPos.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 0.1) {
      this.vel.addScaledVector(toPlayer.normalize(), 20 * dt);
    }
    const spd = this.vel.length();
    if (spd > ENEMY_BH_SPEED * 2) {
      this.vel.multiplyScalar((ENEMY_BH_SPEED * 2) / spd);
    }
    this.mesh.position.addScaledVector(this.vel, dt);
    this.ring.rotation.y += 0.02;
  }

  dispose(scene: THREE.Scene) {
    this.alive = false;
    scene.remove(this.mesh);
    scene.remove(this.ring);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
  }
}

class Player implements PlayerInterface {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  alive: boolean = true;
  absorbedMass: number = 0;
  mesh?: THREE.Mesh;
  glow?: THREE.Sprite;

  constructor(x: number, y: number, z: number, scene: THREE.Scene) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.mass = PLAYER_INITIAL_MASS;
    this.radius = PLAYER_INITIAL_RADIUS;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa })
    );
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);

    const glowMat = new THREE.SpriteMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.set(this.radius * 5, this.radius * 5, 1);
    this.mesh.add(this.glow);
  }

  update(dt: number, keys: { [key: string]: boolean }, enemyBHs: EnemyBH[]) {
    if (!this.alive) return;
    let dx = 0, dz = 0;
    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;
    if (keys['ArrowUp'] || keys['w']) dz -= 1;
    if (keys['ArrowDown'] || keys['s']) dz += 1;
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      this.vel.x = (dx / len) * PLAYER_SPEED;
      this.vel.z = (dz / len) * PLAYER_SPEED;
    } else {
      this.vel.x *= 0.85;
      this.vel.z *= 0.85;
    }
    this.pos.x = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, this.pos.x + this.vel.x * dt));
    this.pos.z = Math.max(-PLAYER_BOUNDS, Math.min(PLAYER_BOUNDS, this.pos.z + this.vel.z * dt));
    if (this.mesh) {
      this.pos.y = 0;
      this.mesh.position.copy(this.pos);
    }
    for (const ebh of enemyBHs) {
      if (!ebh.alive) continue;
      const d = this.pos.distanceTo(ebh.mesh.position);
      if (d < this.radius + ebh.radius - PLAYER_HIT_RADIUS) {
        if (this.mass >= ebh.mass * LOSE_MASS_RATIO) {
          this.grow(ebh.mass * 0.3);
          ebh.dispose(ebh.mesh.parent as THREE.Scene);
        }
      }
    }
  }

  grow(massGain: number) {
    this.mass += massGain;
    this.absorbedMass += massGain;
    this.radius = PLAYER_INITIAL_RADIUS * Math.cbrt(this.mass / PLAYER_INITIAL_MASS);
    if (this.mesh) {
      this.mesh.scale.setScalar(this.radius / PLAYER_INITIAL_RADIUS);
    }
  }

  dispose(scene: THREE.Scene) {
    this.alive = false;
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.glow) {
      (this.glow.material as THREE.SpriteMaterial).dispose();
    }
  }
}

function orbV(x: number, y: number, z: number, ex = 0) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const spd = Math.sqrt(G * BH_MASS / r) * (0.85 + Math.random() * 0.3) + ex;
  const a = Math.atan2(z, x);
  return {
    vx: -Math.sin(a) * spd * (0.9 + Math.random() * 0.2),
    vy: (Math.random() - 0.5) * spd * 0.15,
    vz: Math.cos(a) * spd * (0.9 + Math.random() * 0.2),
  };
}

function createSceneObjects(gl: any) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000008, 0.0005);

  const camera = new THREE.PerspectiveCamera(60, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 3000);

  const renderer = new THREE.WebGLRenderer({
    context: gl,
    antialias: true,
  } as any);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setPixelRatio(Math.min(Platform.OS === 'ios' ? 3 : 2, 2));

  const controls = new OrbitControls(camera);

  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(6000);
  for (let i = 0; i < 6000; i++) {
    sp[i] = (Math.random() - 0.5) * 3000;
  }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true })));
  scene.add(new THREE.AmbientLight(0x111133, 2));
  scene.add(new THREE.PointLight(0xff6699, 3, 600));

  const bhMesh = new THREE.Mesh(
    new THREE.SphereGeometry(BH_RADIUS, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  scene.add(bhMesh);

  const ringColors = [0xff4488, 0xff6622, 0xffaa00];
  const ringRadii = [1.3, 1.8, 2.3];
  const ringThickness = [1.5, 1.2, 0.9];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(BH_RADIUS * ringRadii[i], ringThickness[i], 8, 80),
      new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.6 - i * 0.1,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.08;
    (ring as any)._rs = 0.008 + i * 0.004;
    (ring as any)._ring = true;
    scene.add(ring);
  }

  const diskMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float b = sin(r * 18.0 - time * 3.0 + a * 2.0) * 0.5 + 0.5;
        float f = smoothstep(0.0, 0.15, r) * smoothstep(1.0, 0.7, r);
        vec3 c = mix(vec3(1.0, 0.1, 0.4), vec3(1.0, 0.5, 0.1), b);
        gl_FragColor = vec4(c, f * 0.8 * b);
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const diskMesh = new THREE.Mesh(new THREE.PlaneGeometry(BH_RADIUS * 12, BH_RADIUS * 12), diskMat);
  diskMesh.rotation.x = -Math.PI / 2;
  scene.add(diskMesh);

  return { scene, camera, renderer, controls, diskMat };
}

export default function Scene({ simSpeed, trailColor, onStatsChange, onGameStateChange, onPlayerPosChange }: SceneProps) {
  const glViewRef = useRef<any>(null);

  const bodiesRef = useRef<Body[]>([]);
  const bhMassRef = useRef(BH_MASS);
  const animationIdRef = useRef<number | null>(null);

  const playerRef = useRef<Player | null>(null);
  const enemyBHsRef = useRef<EnemyBH[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameStateRef = useRef<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const scoreRef = useRef(0);

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    diskMat: THREE.ShaderMaterial;
  } | null>(null);

  useEffect(() => {
    const subDown = Keyboard.addListener('keydown' as any, (e: any) => {
      keysRef.current[e.key] = true;
      if (gameStateRef.current === 'idle') {
        gameStateRef.current = 'playing';
        onGameStateChange('playing');
      }
    });
    const subUp = Keyboard.addListener('keyup' as any, (e: any) => {
      keysRef.current[e.key] = false;
    });
    return () => {
      subDown.remove();
      subUp.remove();
    };
  }, [onGameStateChange]);

  const spawnEnemyBH = useCallback(() => {
    if (!sceneObjectsRef.current) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 250 + Math.random() * 100;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const ebh = new EnemyBH(x, 0, z, sceneObjectsRef.current.scene);
    enemyBHsRef.current.push(ebh);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        sceneObjectsRef.current?.controls.handleStart(locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        sceneObjectsRef.current?.controls.handleMove(locationX, locationY);
      },
      onPanResponderRelease: () => {
        sceneObjectsRef.current?.controls.handleEnd();
      },
    })
  ).current;

  const lastPinchDistance = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const handleTouchMove = useCallback((evt: any) => {
    const touches = evt.nativeEvent.touches;
    if (touches.length === 2) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDistance.current !== null) {
        const delta = (lastPinchDistance.current - dist) * 1.5;
        sceneObjectsRef.current?.controls.handleZoom(delta);
      }
      lastPinchDistance.current = dist;
    } else if (touches.length === 1 && gameStateRef.current === 'playing') {
      const tx = touches[0].pageX;
      const ty = touches[0].pageY;
      if (!touchStartRef.current) {
        touchStartRef.current = { x: tx, y: ty };
      }
      touchDeltaRef.current = {
        dx: tx - touchStartRef.current.x,
        dy: ty - touchStartRef.current.y,
      };
      const maxDelta = 80;
      const ddx = Math.max(-1, Math.min(1, touchDeltaRef.current.dx / maxDelta));
      const ddy = Math.max(-1, Math.min(1, touchDeltaRef.current.dy / maxDelta));
      keysRef.current['ArrowLeft'] = ddx < -0.3;
      keysRef.current['ArrowRight'] = ddx > 0.3;
      keysRef.current['ArrowUp'] = ddy < -0.3;
      keysRef.current['ArrowDown'] = ddy > 0.3;
    } else {
      lastPinchDistance.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
    touchStartRef.current = null;
    keysRef.current['ArrowLeft'] = false;
    keysRef.current['ArrowRight'] = false;
    keysRef.current['ArrowUp'] = false;
    keysRef.current['ArrowDown'] = false;
  }, []);

  const spawnFunctionsRef = useRef({
    spawnPlanet: () => {
      const r = 120 + Math.random() * 200;
      const a = Math.random() * Math.PI * 2;
      const el = (Math.random() - 0.5) * 60;
      const x = r * Math.cos(a) * Math.cos(el);
      const y = r * Math.sin(el);
      const z = r * Math.sin(a) * Math.cos(el);
      const v = orbV(x, y, z);
      const colors = [0x44ff88, 0x88aaff, 0xff8844, 0xaaffcc, 0xff44aa];
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, 25 + Math.random() * 20, 7 + Math.random() * 5, color, 'planet', sceneObjectsRef.current.scene);
        bodiesRef.current.push(body);
      }
    },
    spawnStar: () => {
      const r = 200 + Math.random() * 180;
      const a = Math.random() * Math.PI * 2;
      const el = (Math.random() - 0.5) * 40;
      const x = r * Math.cos(a) * Math.cos(el);
      const y = r * Math.sin(el);
      const z = r * Math.sin(a) * Math.cos(el);
      const v = orbV(x, y, z, 2);
      const colors = [0xffffff, 0xffeeaa, 0xaaccff, 0xffaa66];
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, 80 + Math.random() * 60, 12 + Math.random() * 7, color, 'star', sceneObjectsRef.current.scene);
        bodiesRef.current.push(body);
      }
    },
    spawnComet: () => {
      const s = Math.random() < 0.5 ? 1 : -1;
      const x = s * 350 + Math.random() * 80;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 350;
      const v = orbV(x, y, z, 5);
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, 8, 4, 0xaaddff, 'comet', sceneObjectsRef.current.scene);
        bodiesRef.current.push(body);
      }
    },
    clear: () => {
      if (sceneObjectsRef.current) {
        bodiesRef.current.forEach((b) => b.dispose(sceneObjectsRef.current!.scene));
        bodiesRef.current = [];
      }
    },
    setTrailColor: (color: string) => {
      const threeColor = new THREE.Color(color);
      bodiesRef.current.forEach((b) => b.setTrailColor(threeColor));
    },
    restartGame: () => {
      if (!sceneObjectsRef.current) return;
      const scene = sceneObjectsRef.current.scene;
      bodiesRef.current.forEach((b) => b.dispose(scene));
      bodiesRef.current = [];
      enemyBHsRef.current.forEach((ebh) => ebh.dispose(scene));
      enemyBHsRef.current = [];
      if (playerRef.current) {
        playerRef.current.dispose(scene);
        playerRef.current = null;
      }
      bhMassRef.current = BH_MASS;
      scoreRef.current = 0;
      gameStateRef.current = 'idle';
      onGameStateChange('idle');
      keysRef.current = {};
      const player = new Player(0, 0, 0, scene);
      playerRef.current = player;
      spawnEnemyBH();
      spawnFunctionsRef.current.spawnPlanet();
      spawnFunctionsRef.current.spawnPlanet();
      spawnFunctionsRef.current.spawnStar();
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__spawnBody = spawnFunctionsRef.current;
    }
  }, []);

  const onContextCreate = useCallback((gl: any) => {
    const { scene, camera, renderer, controls, diskMat } = createSceneObjects(gl);
    sceneObjectsRef.current = { scene, camera, renderer, controls, diskMat };

    const player = new Player(0, 0, 0, scene);
    playerRef.current = player;

    spawnEnemyBH();
    spawnFunctionsRef.current.spawnPlanet();
    spawnFunctionsRef.current.spawnPlanet();
    spawnFunctionsRef.current.spawnStar();

    let t = 0;
    let enemySpawnTimer = 0;

    const animate = () => {
      t += 0.016;
      diskMat.uniforms.time.value = t;

      scene.children.forEach((c: any) => {
        if (c._ring) c.rotation.y += c._rs;
      });

      const dt = 0.35 * simSpeed;

      const p = playerRef.current;
      if (p && p.alive && gameStateRef.current === 'playing') {
        p.update(dt, keysRef.current, enemyBHsRef.current);
        onPlayerPosChange({ x: p.pos.x, y: p.pos.z });

        for (let i = bodiesRef.current.length - 1; i >= 0; i--) {
          const b = bodiesRef.current[i];
          if (b.mesh.position.distanceTo(p.pos) < p.radius + b.radius) {
            p.grow(b.mass * 0.15);
            scoreRef.current += Math.round(b.mass);
            bhMassRef.current += b.mass * 0.05;
            b.dispose(scene);
            bodiesRef.current.splice(i, 1);
            if (p.absorbedMass >= WIN_MASS_THRESHOLD) {
              gameStateRef.current = 'won';
              onGameStateChange('won');
            }
          }
        }

        for (let i = enemyBHsRef.current.length - 1; i >= 0; i--) {
          const ebh = enemyBHsRef.current[i];
          if (!ebh.alive) {
            enemyBHsRef.current.splice(i, 1);
            continue;
          }
          ebh.update(dt, p.pos);
          const d = p.pos.distanceTo(ebh.mesh.position);
          if (d < p.radius + ebh.radius - PLAYER_HIT_RADIUS) {
            if (p.mass >= ebh.mass * LOSE_MASS_RATIO) {
              p.grow(ebh.mass * 0.3);
              scoreRef.current += 500;
              ebh.dispose(scene);
              enemyBHsRef.current.splice(i, 1);
              if (p.absorbedMass >= WIN_MASS_THRESHOLD) {
                gameStateRef.current = 'won';
                onGameStateChange('won');
              }
            } else {
              gameStateRef.current = 'lost';
              onGameStateChange('lost');
              p.alive = false;
            }
          }
        }

        for (let i = bodiesRef.current.length - 1; i >= 0; i--) {
          const b = bodiesRef.current[i];
          b.update(dt, BH_POS, bhMassRef.current, bodiesRef.current);
          if (b.mesh.position.distanceTo(BH_POS) < BH_RADIUS + b.radius + 6) {
            bhMassRef.current += b.mass * 0.1;
            b.dispose(scene);
            bodiesRef.current.splice(i, 1);
          }
        }

        enemySpawnTimer += dt;
        if (enemySpawnTimer > 8 && enemyBHsRef.current.length < 3) {
          spawnEnemyBH();
          enemySpawnTimer = 0;
        }
      }

      onStatsChange({
        bodyCount: bodiesRef.current.length,
        bhMass: Math.round(bhMassRef.current),
        playerMass: p ? Math.round(p.mass) : 0,
        playerAbsorbed: p ? Math.round(p.absorbedMass) : 0,
        gameState: gameStateRef.current,
        score: scoreRef.current,
      });

      renderer.render(scene, camera);
      gl.endFrame();

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [simSpeed, onStatsChange, onGameStateChange, onPlayerPosChange, spawnEnemyBH]);

  useEffect(() => {
    if (trailColor) {
      spawnFunctionsRef.current.setTrailColor(trailColor);
    }
  }, [trailColor]);

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (sceneObjectsRef.current) {
        bodiesRef.current.forEach((b) => b.dispose(sceneObjectsRef.current!.scene));
        sceneObjectsRef.current.renderer.dispose();
      }
    };
  }, []);

  return (
    <View style={styles.container} {...panResponder.panHandlers} onTouchMove={handleTouchMove}>
      <GLView
        ref={glViewRef}
        style={styles.glView}
        onContextCreate={onContextCreate}
        onTouchStart={handleTouchMove}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </View>
  );
}

export function getSpawnFunctions() {
  if (typeof window !== 'undefined' && (window as any).__spawnBody) {
    return (window as any).__spawnBody;
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glView: {
    flex: 1,
  },
});