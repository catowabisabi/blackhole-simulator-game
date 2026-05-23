import { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Dimensions, Platform, Keyboard, TextInput, Text } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import * as Haptics from 'expo-haptics';
import * as C from '../systems/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BH_POS = new THREE.Vector3();

export const DIFFICULTY = C.DIFFICULTY;

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
  purchasePulse: number;
  update: (dt: number, keys: { [key: string]: boolean }, enemyBHs: EnemyBH[]) => void;
  dispose: (scene: THREE.Scene) => void;
  grow: (massGain: number) => void;
  triggerPurchasePulse: (type: 'mass' | 'speed', amount: number) => void;
}

interface SceneState {
  bodyCount: number;
  bhMass: number;
  playerMass: number;
  playerAbsorbed: number;
  gameState: 'idle' | 'playing' | 'won' | 'lost';
  score: number;
  level: number;
  objectsAbsorbedCount: number;
  enemyBHKilled: number;
}

interface CameraAnimation {
  active: boolean;
  targetDist: number;
  duration: number;
  elapsed: number;
  type: 'win' | 'loss';
}

interface SceneProps {
  simSpeed: number;
  trailColor: string | null;
  onStatsChange: (stats: SceneState) => void;
  onGameStateChange: (state: 'idle' | 'playing' | 'won' | 'lost') => void;
  onPlayerPosChange: (pos: { x: number; y: number }) => void;
  onLevelChange: (level: number) => void;
  onZoomLevelChange: (zoomLevel: number) => void;
  onOverlayOpacityChange: (opacity: number, type: 'win' | 'loss' | null) => void;
  onFirstAbsorb?: () => void;
  onFirstEnemyEncounter?: () => void;
  onFirstLevelUp?: () => void;
  onFirstDeath?: () => void;
  isPaused?: boolean;
  onResume?: () => void;
  difficulty?: 'easy' | 'normal' | 'hard';
  onPurchaseUpgrade?: (type: 'mass' | 'speed', amount: number) => void;
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
    this.dist = C.CAMERA_DIST_INITIAL;
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
    this.theta -= (x - this.prev.x) * C.CAMERA_ANGLE_SENSITIVITY;
    this.phi = Math.max(C.CAMERA_PHI_MIN, Math.min(C.CAMERA_PHI_MAX, this.phi - (y - this.prev.y) * C.CAMERA_ANGLE_SENSITIVITY));
    this.prev = { x, y };
    this.update();
  }

  handleEnd() {
    this.drag = false;
  }

  handleZoom(delta: number) {
    this.dist = Math.max(C.CAMERA_DIST_MIN, Math.min(C.CAMERA_DIST_MAX, this.dist + delta));
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
  tailMass: number[] = [];
  massOpacity: number;
  inPullZone: boolean = false;
  wasInPullZone: boolean = false;
  wasInTidalZone: boolean = false;
  originalColor: number;
  originalEmissive: THREE.Color | null = null;

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

    const geo = new THREE.SphereGeometry(radius, C.SPHERE_SEGMENTS, C.SPHERE_SEGMENTS);
    let mat: THREE.Material;
    let glowSprite: THREE.Sprite | null = null;

    if (type === 'star') {
      mat = new THREE.MeshBasicMaterial({ color });
      this.light = new THREE.PointLight(color, C.STAR_GLOW_INTENSITY, radius * C.STAR_GLOW_RADIUS_MULT);
      scene.add(this.light);

      const glowMat = new THREE.SpriteMaterial({
        color: color,
        transparent: true,
        opacity: C.STAR_GLOW_OPACITY_START || 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      glowSprite = new THREE.Sprite(glowMat);
      glowSprite.scale.set(radius * C.STAR_GLOW_SCALE, radius * C.STAR_GLOW_SCALE, 1);
    } else {
      mat = new THREE.MeshPhongMaterial({
        color,
        emissive: new THREE.Color(color).multiplyScalar(C.STAR_EMISSIVE_MULT),
        shininess: C.STAR_SHININESS,
      });
    }

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    if (glowSprite) {
      this.glow = glowSprite;
      this.mesh.add(this.glow);
    }

    this.originalColor = color;
    if (type !== 'star') {
      this.originalEmissive = new THREE.Color((mat as THREE.MeshPhongMaterial).emissive.getHex());
    }

    this.tailColor = new THREE.Color().setHSL(Math.random(), 1, 0.6);
    this.tailMass = [];
    const minTrailMass = 5;
    const maxTrailMass = 100;
    this.massOpacity = Math.max(0.1, Math.min(0.9, (mass - minTrailMass) / (maxTrailMass - minTrailMass)));

    const tg = new THREE.BufferGeometry();
    const positions = new Float32Array(C.TAIL * 3);
    const alphas = new Float32Array(C.TAIL);
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
    this.vel.addScaledVector(diff.normalize(), C.G * bhMass / Math.max(dist * dist, C.MIN_BH_DISTANCE) * dt);

    for (const o of bodies) {
      if (o === this || !o.alive) continue;
      const d2 = o.mesh.position.clone().sub(this.mesh.position);
      const d2Len = Math.max(d2.length(), 10);
      this.vel.addScaledVector(d2.normalize(), C.G * o.mass / (d2Len * d2Len) * dt);
    }

    this.mesh.position.addScaledVector(this.vel, dt);

    if (this.light) {
      this.light.position.copy(this.mesh.position);
    }

    this.tailPts.push(this.mesh.position.clone());
    this.tailMass.push(this.mass);
    if (this.tailPts.length > C.TAIL) {
      this.tailPts.shift();
      this.tailMass.shift();
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
        const massFactor = this.tailMass[j] / Math.max(this.mass, 1);
        aa[j] = (j / (n - 1)) * (0.2 + 0.8 * massFactor);
      }
      this.tailGeo.attributes.position.needsUpdate = true;
      this.tailGeo.attributes.alpha.needsUpdate = true;
      this.tailGeo.setDrawRange(0, n);
    }
  }

  applyPullZoneTint(proximityFactor: number) {
    const mat = this.mesh.material as THREE.MeshPhongMaterial;
    if (this.type === 'star' && this.glow) {
      const glowMat = this.glow.material as THREE.SpriteMaterial;
      const targetOpacity = C.PULL_ZONE_GLOW_MIN + proximityFactor * (C.PULL_ZONE_GLOW_MAX - C.PULL_ZONE_GLOW_MIN);
      glowMat.opacity = Math.min(C.PULL_ZONE_GLOW_MAX, Math.max(C.PULL_ZONE_GLOW_MIN, targetOpacity));
    } else if (this.originalEmissive) {
      const orangeColor = new THREE.Color(C.PULL_ZONE_TINT);
      mat.emissive.lerp(orangeColor, proximityFactor * C.PULL_ZONE_EMISSIVE_STRENGTH);
    }
  }

  clearPullZoneTint() {
    const mat = this.mesh.material as THREE.MeshPhongMaterial;
    if (this.type === 'star' && this.glow) {
      const glowMat = this.glow.material as THREE.SpriteMaterial;
      glowMat.opacity = C.STAR_GLOW_OPACITY_START;
    }
    if (this.originalEmissive) {
      mat.emissive.copy(this.originalEmissive);
    }
  }

  applyTidalTint(intensity: number) {
    // Tint body color toward orange-red when in tidal range
    const mat = this.mesh.material as THREE.MeshPhongMaterial;
    const tidalColor = new THREE.Color(C.TIDAL_COLOR);
    const currentColor = new THREE.Color(this.originalColor);
    const targetColor = currentColor.lerp(tidalColor, intensity * 0.6);
    mat.color.copy(targetColor);
    if (this.originalEmissive) {
      mat.emissive.lerp(tidalColor, intensity * 0.5);
    }
  }

  clearTidalTint() {
    const mat = this.mesh.material as THREE.MeshPhongMaterial;
    mat.color.setHex(this.originalColor);
    if (this.originalEmissive) {
      mat.emissive.copy(this.originalEmissive);
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
  maxSpeed: number;
  labelSprite?: THREE.Sprite;
  stateSprite?: THREE.Sprite;
  labelCanvas?: HTMLCanvasElement;
  labelCtx?: CanvasRenderingContext2D;
  stateCanvas?: HTMLCanvasElement;
  stateCtx?: CanvasRenderingContext2D;
  stateTexture?: THREE.CanvasTexture;
  enemyIndex: number = 1;
  enemyTotal: number = 1;

  private createTextTexture(text: string, fontSize: number = 24, canvasWidth: number = 128, canvasHeight: number = 48): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texture: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    
    return { canvas, ctx, texture };
  }

  constructor(x: number, y: number, z: number, scene: THREE.Scene, mass: number, speed: number, enemyIndex: number = 1, enemyTotal: number = 1) {
    this.mass = mass;
    this.radius = C.ENEMY_BH_RADIUS_BASE + mass / C.ENEMY_BH_RADIUS_MASS_DIVISOR;
    this.maxSpeed = speed;
    const angle = Math.atan2(z, x);
    this.vel = new THREE.Vector3(
      -Math.sin(angle) * speed,
      0,
      Math.cos(angle) * speed
    );

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, C.ENEMY_SPHERE_SEGMENTS, C.ENEMY_SPHERE_SEGMENTS),
      new THREE.MeshBasicMaterial({ color: C.ENEMY_COLOR })
    );
    this.mesh.position.set(x, y, z);
    scene.add(this.mesh);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.radius * C.ENEMY_BH_RING_RADIUS_MULT, C.ENEMY_BH_RING_THICKNESS, C.RING_SEGMENTS, C.RING_SEGMENTS),
      new THREE.MeshBasicMaterial({
        color: C.ENEMY_RING_COLOR,
        transparent: true,
        opacity: C.ENEMY_RING_OPACITY_START,
        blending: THREE.AdditiveBlending,
      })
    );
    this.ring.rotation.x = Math.PI / 2;
    this.mesh.add(this.ring);

    this.enemyIndex = enemyIndex;
    this.enemyTotal = enemyTotal;

    const labelData = this.createTextTexture(`${enemyIndex}/${enemyTotal}`, 20, 96, 36);
    this.labelCanvas = labelData.canvas;
    this.labelCtx = labelData.ctx;
    const labelMat = new THREE.SpriteMaterial({ map: labelData.texture, transparent: true, depthWrite: false });
    this.labelSprite = new THREE.Sprite(labelMat);
    this.labelSprite.scale.set(6, 3, 1);
    this.labelSprite.position.set(0, this.radius * 1.4, 0);
    this.mesh.add(this.labelSprite);

    const stateData = this.createTextTexture('retreating', 18, 128, 36);
    this.stateCanvas = stateData.canvas;
    this.stateCtx = stateData.ctx;
    this.stateTexture = stateData.texture;
    const stateMat = new THREE.SpriteMaterial({ map: this.stateTexture, transparent: true, depthWrite: false });
    this.stateSprite = new THREE.Sprite(stateMat);
    this.stateSprite.scale.set(8, 3, 1);
    this.stateSprite.position.set(0, this.radius * 1.2, 0);
    this.mesh.add(this.stateSprite);
  }

  update(dt: number, playerPos: THREE.Vector3) {
    const toPlayer = playerPos.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > C.ENEMY_BH_SIGHTING_RADIUS) {
      this.vel.addScaledVector(toPlayer.normalize(), C.ENEMY_BH_FORCE_TO_PLAYER * dt);
    }
    const spd = this.vel.length();
    if (spd > this.maxSpeed * 2) {
      this.vel.multiplyScalar((this.maxSpeed * 2) / spd);
    }
    this.mesh.position.addScaledVector(this.vel, dt);
    this.ring.rotation.y += C.ENEMY_BH_RING_ROTATION_SPEED;

    if (this.stateCanvas && this.stateCtx && this.stateTexture) {
      let state = 'retreating';
      if (dist < C.ENEMY_BH_SIGHTING_RADIUS * 0.5) {
        state = 'chasing';
      } else if (dist < C.ENEMY_BH_SIGHTING_RADIUS) {
        state = 'curious';
      }
      this.stateCtx.clearRect(0, 0, this.stateCanvas.width, this.stateCanvas.height);
      this.stateCtx.font = 'bold 18px Arial';
      this.stateCtx.textAlign = 'center';
      this.stateCtx.textBaseline = 'middle';
      this.stateCtx.strokeStyle = '#000000';
      this.stateCtx.lineWidth = 3;
      this.stateCtx.strokeText(state, this.stateCanvas.width / 2, this.stateCanvas.height / 2);
      this.stateCtx.fillStyle = '#FFFFFF';
      this.stateCtx.fillText(state, this.stateCanvas.width / 2, this.stateCanvas.height / 2);
      this.stateTexture.needsUpdate = true;
    }
  }

  dispose(scene: THREE.Scene) {
    this.alive = false;
    scene.remove(this.mesh);
    scene.remove(this.ring);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
    if (this.labelSprite) {
      const labelMat = this.labelSprite.material as THREE.SpriteMaterial;
      if (labelMat.map) (labelMat.map as THREE.Texture).dispose();
      labelMat.dispose();
    }
    if (this.stateSprite && this.stateTexture) {
      const stateMat = this.stateSprite.material as THREE.SpriteMaterial;
      this.stateTexture.dispose();
      stateMat.dispose();
    }
  }
}

const createGlowTexture = (color: number, opacity: number): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  const c = new THREE.Color(color);
  grad.addColorStop(0, `rgba(${Math.floor(c.r * 255)},${Math.floor(c.g * 255)},${Math.floor(c.b * 255)},${opacity})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
};

class Player implements PlayerInterface {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mass: number;
  radius: number;
  alive: boolean = true;
  absorbedMass: number = 0;
  growthFlash: number = 0;
  purchasePulse: number = 0;
  mesh?: THREE.Mesh;
  glow?: THREE.Sprite;
  pulseRing?: THREE.Mesh;
  purchasePulseLabel?: THREE.Sprite;
  labelCanvas?: HTMLCanvasElement;
  labelCtx?: CanvasRenderingContext2D;
  labelTexture?: THREE.CanvasTexture;
  purchasePulseType: 'mass' | 'speed' | null = null;

  constructor(x: number, y: number, z: number, scene: THREE.Scene) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
      this.mass = C.PLAYER_INITIAL_MASS;
      this.radius = C.PLAYER_INITIAL_RADIUS;

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, C.SPHERE_SEGMENTS, C.SPHERE_SEGMENTS),
      new THREE.MeshBasicMaterial({ color: C.PLAYER_COLOR })
    );
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);

    const glowMat = new THREE.SpriteMaterial({
      color: C.PLAYER_COLOR,
      transparent: true,
      opacity: C.PLAYER_GLOW_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.set(this.radius * C.PLAYER_GLOW_SCALE, this.radius * C.PLAYER_GLOW_SCALE, 1);
    this.mesh.add(this.glow);

    // Create pulse ring for purchase feedback
    const ringGeo = new THREE.TorusGeometry(this.radius * 1.5, 0.4, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
    this.pulseRing.rotation.x = Math.PI / 2;
    scene.add(this.pulseRing);

    // Create label canvas for floating text
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelCtx = this.labelCanvas.getContext('2d')!;
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: this.labelTexture, transparent: true, depthWrite: false });
    this.purchasePulseLabel = new THREE.Sprite(labelMat);
    this.purchasePulseLabel.scale.set(12, 3, 1);
    this.purchasePulseLabel.position.set(0, this.radius * 2.5, 0);
    this.purchasePulseLabel.visible = false;
    scene.add(this.purchasePulseLabel);
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
      this.vel.x = (dx / len) * C.PLAYER_SPEED;
      this.vel.z = (dz / len) * C.PLAYER_SPEED;
    } else {
      this.vel.x *= C.PLAYER_VELOCITY_DECAY;
      this.vel.z *= C.PLAYER_VELOCITY_DECAY;
    }
    this.pos.x = Math.max(-C.PLAYER_BOUNDS, Math.min(C.PLAYER_BOUNDS, this.pos.x + this.vel.x * dt));
    this.pos.z = Math.max(-C.PLAYER_BOUNDS, Math.min(C.PLAYER_BOUNDS, this.pos.z + this.vel.z * dt));
    if (this.mesh) {
      this.pos.y = 0;
      this.mesh.position.copy(this.pos);
    }
    for (const ebh of enemyBHs) {
      if (!ebh.alive) continue;
      const d = this.pos.distanceTo(ebh.mesh.position);
      if (d < this.radius + ebh.radius - C.PLAYER_HIT_RADIUS) {
        if (this.mass >= ebh.mass * C.LOSE_MASS_RATIO) {
          this.grow(ebh.mass * C.MASS_GROW_ENEMY_RATIO);
          ebh.dispose(ebh.mesh.parent as THREE.Scene);
        }
      }
    }

    // Animate purchase pulse
    if (this.purchasePulse > 0) {
      this.purchasePulse -= dt * 2.0; // Decay faster
      if (this.pulseRing) {
        const mat = this.pulseRing.material as THREE.MeshBasicMaterial;
        mat.opacity = this.purchasePulse * 0.8;
        const scale = 1.0 + (1.0 - this.purchasePulse) * 1.5;
        this.pulseRing.scale.setScalar(scale);
        this.pulseRing.position.copy(this.pos);
        this.pulseRing.rotation.z += dt * 3.0;
      }
      if (this.purchasePulseLabel && this.labelCanvas && this.labelCtx && this.labelTexture) {
        this.purchasePulseLabel.position.y = this.radius * 2.5 + (1.0 - this.purchasePulse) * 8;
        (this.purchasePulseLabel.material as THREE.SpriteMaterial).opacity = this.purchasePulse;
        this.purchasePulseLabel.position.copy(this.pos);
      }
      if (this.purchasePulse <= 0) {
        if (this.pulseRing) (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = 0;
        if (this.purchasePulseLabel) this.purchasePulseLabel.visible = false;
      }
    }
  }

  grow(massGain: number) {
    this.mass += massGain;
    this.absorbedMass += massGain;
    this.radius = C.PLAYER_INITIAL_RADIUS * Math.cbrt(this.mass / C.PLAYER_INITIAL_MASS);
    if (this.mesh) {
      this.mesh.scale.setScalar(this.radius / C.PLAYER_INITIAL_RADIUS);
    }
    SaveManager.addAbsorbedMass(massGain);
    this.growthFlash = C.GROWTH_FLASH_RESET;
  }

  triggerPurchasePulse(type: 'mass' | 'speed', amount: number) {
    this.purchasePulse = 1.0;
    this.purchasePulseType = type;

    // Update pulse ring color based on type
    if (this.pulseRing) {
      const mat = this.pulseRing.material as THREE.MeshBasicMaterial;
      mat.color.setHex(type === 'mass' ? 0x00ffaa : 0xffaa00);
      mat.opacity = 0.8;
      this.pulseRing.scale.setScalar(1.0);
    }

    // Update label texture
    if (this.labelCtx && this.labelCanvas && this.labelTexture) {
      this.labelCtx.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
      const text = type === 'mass' ? `+${Math.round(amount)} MASS` : `+${amount}x SPEED`;
      const textColor = type === 'mass' ? '#00ffaa' : '#ffaa00';
      this.labelCtx.font = 'bold 28px Arial';
      this.labelCtx.textAlign = 'center';
      this.labelCtx.textBaseline = 'middle';
      this.labelCtx.strokeStyle = '#000000';
      this.labelCtx.lineWidth = 4;
      this.labelCtx.strokeText(text, this.labelCanvas.width / 2, this.labelCanvas.height / 2);
      this.labelCtx.fillStyle = textColor;
      this.labelCtx.fillText(text, this.labelCanvas.width / 2, this.labelCanvas.height / 2);
      this.labelTexture.needsUpdate = true;
    }

    if (this.purchasePulseLabel) {
      this.purchasePulseLabel.visible = true;
      this.purchasePulseLabel.position.y = this.radius * 2.5;
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
  const spd = Math.sqrt(C.G * C.BH_MASS / r) * (C.SPAWN_ORBIT_SPEED_BASE + Math.random() * C.SPAWN_ORBIT_SPEED_VAR) + ex;
  const a = Math.atan2(z, x);
  return {
    vx: -Math.sin(a) * spd * (C.SPAWN_VELOCITY_SCALE + Math.random() * C.SPAWN_VELOCITY_VAR),
    vy: (Math.random() - 0.5) * spd * C.SPAWN_VERTICAL_VAR,
    vz: Math.cos(a) * spd * (C.SPAWN_VELOCITY_SCALE + Math.random() * C.SPAWN_VELOCITY_VAR),
  };
}

function createSceneObjects(gl: any) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.FOG_COLOR, C.FOG_DENSITY);

  const camera = new THREE.PerspectiveCamera(C.FOV, SCREEN_WIDTH / SCREEN_HEIGHT, C.CAMERA_NEAR, C.CAMERA_FAR);

  const renderer = new THREE.WebGLRenderer({
    context: gl,
    antialias: true,
  } as any);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setPixelRatio(Math.min(Platform.OS === 'ios' ? C.PIXEL_RATIO_IOS : C.PIXEL_RATIO_ANDROID, C.PIXEL_RATIO_ANDROID));

  const controls = new OrbitControls(camera);

  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(C.STAR_FIELD_COUNT);
  for (let i = 0; i < C.STAR_FIELD_COUNT; i++) {
    sp[i] = (Math.random() - 0.5) * C.STAR_FIELD_SPREAD;
  }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: C.BACKGROUND_STAR_COLOR, size: C.STAR_SIZE, sizeAttenuation: true })));
  scene.add(new THREE.AmbientLight(C.AMBIENT_LIGHT_COLOR, 2));
  scene.add(new THREE.PointLight(C.POINT_LIGHT_COLOR, 3, 600));

  const bhMesh = new THREE.Mesh(
    new THREE.SphereGeometry(C.BH_RADIUS, C.BH_SPHERE_SEGMENTS, C.BH_SPHERE_SEGMENTS),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  scene.add(bhMesh);

  const ringColors = C.BG_RING_COLORS;
  const ringRadii = C.BG_RING_RADII;
  const ringThickness = C.BG_RING_THICKNESS;
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(C.BH_RADIUS * ringRadii[i], ringThickness[i], C.RING_SEGMENTS, C.RING_SEGMENTS),
      new THREE.MeshBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: C.BG_RING_OPACITY_START - i * C.BG_RING_OPACITY_DECAY,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = Math.PI / 2 + (i - 1) * C.BG_RING_ROTATION_OFFSET;
    (ring as any)._rs = C.RING_ROTATION_SPEED_BASE + i * 0.004;
    (ring as any)._ring = true;
    scene.add(ring);
  }

  const diskMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, growthFlash: { value: 0.0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float growthFlash;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float b = sin(r * 18.0 - time * 3.0 + a * 2.0) * 0.5 + 0.5;
        float f = smoothstep(0.0, 0.15, r) * smoothstep(1.0, 0.7, r);
        vec3 c = mix(vec3(1.0, 0.1, 0.4), vec3(1.0, 0.5, 0.1), b);
        vec3 finalColor = mix(c, vec3(1.0, 0.85, 0.5), growthFlash * 0.7) * (1.0 + growthFlash * 0.8);
        gl_FragColor = vec4(finalColor, f * 0.8 * b * (1.0 + growthFlash * 0.5));
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const diskMesh = new THREE.Mesh(new THREE.PlaneGeometry(C.BH_RADIUS * C.DISK_SHADER_R_SCALE, C.BH_RADIUS * C.DISK_SHADER_R_SCALE), diskMat);
  diskMesh.rotation.x = -Math.PI / 2;
  scene.add(diskMesh);

  const pullRadius = C.BH_MASS * C.GRAVITY_PULL_SCALE;
  const pullRingMat = new THREE.MeshBasicMaterial({
    color: 0xff6633,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pullRing = new THREE.Mesh(
    new THREE.TorusGeometry(pullRadius, 0.5, 8, 80),
    pullRingMat
  );
  pullRing.rotation.x = Math.PI / 2;
  scene.add(pullRing);

  const lensMat = new THREE.ShaderMaterial({
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
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = vUv - center;
        float dist = length(delta);
        float strength = 0.15;
        float falloff = pow(max(0.0, 1.0 - dist * 1.5), 2.0);
        vec2 offset = normalize(delta + 0.001) * falloff * strength;
        vec2 warpedUv = vUv + offset;
        float ring = smoothstep(0.0, 0.02, abs(dist - 0.3)) * 0.15;
        gl_FragColor = vec4(0.7, 0.8, 1.0, ring + falloff * 0.05);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lensSphere = new THREE.Mesh(new THREE.SphereGeometry(C.BH_RADIUS * 4, 32, 32), lensMat);
  lensSphere.rotation.x = Math.PI / 2;
  scene.add(lensSphere);

  return { scene, camera, renderer, controls, diskMat, pullRing, pullRingMat, lensSphere, lensMat };
}

export default function Scene({ simSpeed, trailColor, onStatsChange, onGameStateChange, onPlayerPosChange, onLevelChange, onZoomLevelChange, onOverlayOpacityChange, onFirstAbsorb, onFirstEnemyEncounter, onFirstLevelUp, onFirstDeath, isPaused = false, onResume, difficulty = 'normal', onPurchaseUpgrade }: SceneProps) {
  const glViewRef = useRef<any>(null);

  const bodiesRef = useRef<Body[]>([]);
  const bhMassRef = useRef(C.BH_MASS);
  const animationIdRef = useRef<number | null>(null);

  const playerRef = useRef<Player | null>(null);
  const enemyBHsRef = useRef<EnemyBH[]>([]);
  const enemyCountRef = useRef(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameStateRef = useRef<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const objectsAbsorbedCountRef = useRef(0);
  const enemyBHKilledRef = useRef(0);
  const levelUpPendingRef = useRef(false);
  const hintFirstAbsorbRef = useRef(false);
  const hintFirstEnemyRef = useRef(false);
  const hintFirstLevelUpRef = useRef(false);
  const hintFirstDeathRef = useRef(false);
  const spawnWarningsRef = useRef<SpawnWarning[]>([]);
  const goldenBurstsRef = useRef<GoldenBurst[]>([]);
  const maxLevelBurstFiredRef = useRef(false);
  const cameraAnimationRef = useRef<CameraAnimation>({ active: false, targetDist: C.CAMERA_DIST_INITIAL, duration: C.CAMERA_ANIM_DURATION_WIN, elapsed: 0, type: 'win' });
  const ghostEchoRef = useRef<{ mesh: THREE.Mesh; glow: THREE.Sprite } | null>(null);
  const ghostFadeRef = useRef(1.0);
  const ringPulsesRef = useRef<RingPulse[]>([]);
  const bifurcationZoneRef = useRef(false);
  const bifurcationIntensityRef = useRef(0);
  const bifurcationSonarTimerRef = useRef(0);
  const bifurcationPulsesRef = useRef<BifurcationPulse[]>([]);
  const levelUpFlashRef = useRef(0);
  const noReturnFlashesRef = useRef<NoReturnFlash[]>([]);
  const cameraShakeOffsetRef = useRef({ x: 0, y: 0 });

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    diskMat: THREE.ShaderMaterial;
    pullRing: THREE.Mesh;
    pullRingMat: THREE.MeshBasicMaterial;
    lensSphere: THREE.Mesh;
    lensMat: THREE.ShaderMaterial;
  } | null>(null);

  useEffect(() => {
    const subDown = Keyboard.addListener('keydown' as any, (e: any) => {
      keysRef.current[e.key] = true;
      if (gameStateRef.current === 'idle') {
        gameStateRef.current = 'playing';
        onGameStateChange('playing');
        // Clean up ghost echo on restart
        if (ghostEchoRef.current) {
          if (sceneObjectsRef.current?.scene) sceneObjectsRef.current.scene.remove(ghostEchoRef.current.mesh);
          if (ghostEchoRef.current.glow.parent) ghostEchoRef.current.glow.parent.remove(ghostEchoRef.current.glow);
          ghostEchoRef.current = null;
        }
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

interface SpawnWarning {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  spawnPos: THREE.Vector3;
}

function createSpawnWarning(scene: THREE.Scene, x: number, y: number, z: number): SpawnWarning {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(C.SPAWN_WARNING_RADIUS, C.ENEMY_BH_RING_THICKNESS, C.SPAWN_WARNING_SEGMENTS, C.SPAWN_WARNING_SEGMENTS),
    new THREE.MeshBasicMaterial({
      color: C.ENEMY_RING_COLOR,
      transparent: true,
      opacity: C.SPAWN_WARNING_OPACITY_START,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.position.set(x, y, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  return { mesh: ring, startTime: performance.now() / 1000, duration: C.SPAWN_WARNING_DURATION, spawnPos: new THREE.Vector3(x, y, z) };
}

function updateSpawnWarnings(warnings: SpawnWarning[], scene: THREE.Scene, currentTime: number) {
  for (let i = warnings.length - 1; i >= 0; i--) {
    const w = warnings[i];
    const age = currentTime - w.startTime;
    if (age >= w.duration) {
      scene.remove(w.mesh);
      w.mesh.geometry.dispose();
      (w.mesh.material as THREE.Material).dispose();
      warnings.splice(i, 1);
    } else {
      const t = age / w.duration;
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = C.SPAWN_WARNING_OPACITY_START * (1 - t);
      w.mesh.scale.setScalar(C.SPAWN_WARNING_SCALE_START + t * C.SPAWN_WARNING_SCALE_GROWTH);
      w.mesh.rotation.z += C.SPAWN_WARNING_ROTATION_SPEED;
    }
  }
}

interface GoldenBurst {
  points: THREE.Points;
  startTime: number;
  duration: number;
  origin: THREE.Vector3;
  velocities: THREE.Vector3[];
}

function createGoldenBurst(scene: THREE.Scene, x: number, y: number, z: number): GoldenBurst {
  const count = C.GOLDEN_BURST_PARTICLE_COUNT;
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 20 + Math.random() * 30;
    velocities.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    ));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: C.GOLDEN_BURST_COLOR,
    size: 3,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return { points, startTime: performance.now() / 1000, duration: C.GOLDEN_BURST_DURATION, origin: new THREE.Vector3(x, y, z), velocities };
}

function updateGoldenBursts(bursts: GoldenBurst[], scene: THREE.Scene, currentTime: number) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    const age = currentTime - b.startTime;
    if (age >= b.duration) {
      scene.remove(b.points);
      b.points.geometry.dispose();
      (b.points.material as THREE.Material).dispose();
      bursts.splice(i, 1);
    } else {
      const t = age / b.duration;
      const posArr = b.points.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < b.velocities.length; j++) {
        const vel = b.velocities[j];
        posArr[j * 3] += vel.x * 0.016 * (1 - t);
        posArr[j * 3 + 1] += vel.y * 0.016 * (1 - t);
        posArr[j * 3 + 2] += vel.z * 0.016 * (1 - t);
      }
      b.points.geometry.attributes.position.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = 1.0 - t;
    }
  }
}

interface RingPulse {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

function createRingPulse(scene: THREE.Scene, x: number, y: number, z: number): RingPulse {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.3, 8, 64),
    new THREE.MeshBasicMaterial({
      color: C.RING_PULSE_COLOR,
      transparent: true,
      opacity: C.RING_PULSE_OPACITY_START,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  ring.position.set(x, y, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  return { mesh: ring, startTime: performance.now() / 1000, duration: C.RING_PULSE_DURATION };
}

function updateRingPulses(pulses: RingPulse[], scene: THREE.Scene, currentTime: number) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    const age = currentTime - p.startTime;
    if (age >= p.duration) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      pulses.splice(i, 1);
    } else {
      const t = age / p.duration;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = C.RING_PULSE_OPACITY_START * (1 - t);
      const scale = C.RING_PULSE_SCALE_START + t * (C.RING_PULSE_SCALE_END - C.RING_PULSE_SCALE_START);
      p.mesh.scale.setScalar(scale);
    }
  }
}

interface BifurcationPulse {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

function createBifurcationPulse(scene: THREE.Scene, x: number, y: number, z: number, playerRadius: number): BifurcationPulse {
  const startRadius = playerRadius * C.BIFURCATION_SONAR_START_RADIUS;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(startRadius, 0.4, 8, 64),
    new THREE.MeshBasicMaterial({
      color: C.BIFURCATION_SONAR_COLOR,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  ring.position.set(x, y, z);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  return { mesh: ring, startTime: performance.now() / 1000, duration: C.BIFURCATION_PULSE_DURATION };
}

function updateBifurcationPulses(pulses: BifurcationPulse[], scene: THREE.Scene, currentTime: number, playerRadius: number) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    const age = currentTime - p.startTime;
    if (age >= p.duration) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      pulses.splice(i, 1);
    } else {
      const t = age / p.duration;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * (1 - t);
      const startRadius = playerRadius * C.BIFURCATION_SONAR_START_RADIUS;
      const endRadius = startRadius * C.BIFURCATION_SONAR_END_SCALE;
      const scale = startRadius + t * (endRadius - startRadius);
      p.mesh.scale.setScalar(scale);
      const color = new THREE.Color(C.BIFURCATION_SONAR_COLOR).lerp(new THREE.Color(C.BIFURCATION_SONAR_END_COLOR), t);
      mat.color = color;
    }
  }
}

interface NoReturnFlash {
  light: THREE.PointLight;
  startTime: number;
  duration: number;
}

function createNoReturnFlash(scene: THREE.Scene, x: number, y: number, z: number): NoReturnFlash {
  const light = new THREE.PointLight(C.POINT_OF_NO_RETURN_FLASH_COLOR, C.POINT_OF_NO_RETURN_FLASH_INTENSITY, 50);
  light.position.set(x, y, z);
  scene.add(light);
  return { light, startTime: performance.now() / 1000, duration: C.POINT_OF_NO_RETURN_FLASH_DURATION };
}

function updateNoReturnFlashes(flashes: NoReturnFlash[], scene: THREE.Scene, currentTime: number) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i];
    const age = currentTime - f.startTime;
    if (age >= f.duration) {
      scene.remove(f.light);
      flashes.splice(i, 1);
    } else {
      const t = age / f.duration;
      f.light.intensity = C.POINT_OF_NO_RETURN_FLASH_INTENSITY * (1 - t);
    }
  }
}

const spawnEnemyBH = useCallback((mass: number, speed: number) => {
  if (!sceneObjectsRef.current) return;
  const { camera } = sceneObjectsRef.current;
  const cameraPos = camera.position;
  const target = sceneObjectsRef.current.controls.target;
  
  // Get camera forward direction (from camera toward target)
  const forward = new THREE.Vector3().subVectors(target, cameraPos).normalize();
  
  // Get camera right vector
  const up = new THREE.Vector3(0, 1, 0);
  
  // Random angle within a 90-degree cone in front of camera (spread across ~120 degrees for visibility)
  const spreadAngle = (Math.random() - 0.5) * C.SPAWN_SPREAD_ANGLE;
  const spawnDir = forward.clone().applyAxisAngle(up, spreadAngle);

  const spawnDist = C.SPAWN_DIST_MIN + Math.random() * (C.SPAWN_DIST_MAX - C.SPAWN_DIST_MIN);
  
  const x = spawnDir.x * spawnDist;
  const z = spawnDir.z * spawnDist;
  
  // Create spawn warning effect
  const warning = createSpawnWarning(sceneObjectsRef.current.scene, x, 0, z);
  spawnWarningsRef.current.push(warning);
  
  const ebh = new EnemyBH(x, 0, z, sceneObjectsRef.current.scene, mass, speed, ++enemyCountRef.current, enemyBHsRef.current.length + 1);
  enemyBHsRef.current.push(ebh);
  
  // Play spawn sound
  AudioManager.playSFX('spawn');
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
        const delta = (lastPinchDistance.current - dist) * C.TOUCH_SENSITIVITY;
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
      const maxDelta = C.TOUCH_MAX_DELTA;
      const ddx = Math.max(-1, Math.min(1, touchDeltaRef.current.dx / maxDelta));
      const ddy = Math.max(-1, Math.min(1, touchDeltaRef.current.dy / maxDelta));
      keysRef.current['ArrowLeft'] = ddx < -C.TOUCH_DEADZONE;
      keysRef.current['ArrowRight'] = ddx > C.TOUCH_DEADZONE;
      keysRef.current['ArrowUp'] = ddy < -C.TOUCH_DEADZONE;
      keysRef.current['ArrowDown'] = ddy > C.TOUCH_DEADZONE;
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
      const r = C.SPAWN_PLANET_MIN + Math.random() * (C.SPAWN_PLANET_MAX - C.SPAWN_PLANET_MIN);
      const a = Math.random() * Math.PI * 2;
      const el = (Math.random() - 0.5) * C.SPAWN_COMET_Y_RANGE;
      const x = r * Math.cos(a) * Math.cos(el);
      const y = r * Math.sin(el);
      const z = r * Math.sin(a) * Math.cos(el);
      const v = orbV(x, y, z);
      const colors = C.PLANET_COLORS;
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, C.BODY_MASS_PLANET_MIN + Math.random() * C.BODY_MASS_PLANET_VAR, C.BODY_RADIUS_PLANET_MIN + Math.random() * C.BODY_RADIUS_PLANET_VAR, color, 'planet', sceneObjectsRef.current.scene);
        bodiesRef.current.push(body);
      }
    },
    spawnStar: () => {
      const r = C.SPAWN_STAR_MIN + Math.random() * C.SPAWN_STAR_MAX;
      const a = Math.random() * Math.PI * 2;
      const el = (Math.random() - 0.5) * 40;
      const x = r * Math.cos(a) * Math.cos(el);
      const y = r * Math.sin(el);
      const z = r * Math.sin(a) * Math.cos(el);
      const v = orbV(x, y, z, C.SPAWN_STAR_SPEED_BOOST);
      const colors = C.STAR_COLORS;
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, C.BODY_MASS_STAR_MIN + Math.random() * C.BODY_MASS_STAR_VAR, C.BODY_RADIUS_STAR_MIN + Math.random() * C.BODY_RADIUS_STAR_VAR, color, 'star', sceneObjectsRef.current.scene);
        bodiesRef.current.push(body);
      }
    },
    spawnComet: () => {
      const s = Math.random() < 0.5 ? 1 : -1;
      const x = s * C.SPAWN_COMET_X_BASE + Math.random() * C.SPAWN_COMET_X_VAR;
      const y = (Math.random() - 0.5) * C.SPAWN_COMET_Y_RANGE;
      const z = (Math.random() - 0.5) * C.SPAWN_COMET_Z_RANGE;
      const v = orbV(x, y, z, C.SPAWN_COMET_SPEED_BOOST);
      if (sceneObjectsRef.current) {
        const body = new Body(x, y, z, v.vx, v.vy, v.vz, C.BODY_MASS_COMET, C.BODY_RADIUS_COMET, C.COMET_COLOR, 'comet', sceneObjectsRef.current.scene);
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
      bhMassRef.current = C.BH_MASS;
      scoreRef.current = 0;
      levelRef.current = 1;
      objectsAbsorbedCountRef.current = 0;
      enemyBHKilledRef.current = 0;
      levelUpPendingRef.current = false;
      enemyCountRef.current = 0;
      gameStateRef.current = 'idle';
      onGameStateChange('idle');
      keysRef.current = {};
      cameraAnimationRef.current = { active: false, targetDist: C.CAMERA_DIST_INITIAL, duration: C.CAMERA_ANIM_DURATION_WIN, elapsed: 0, type: 'win' };
      const player = new Player(0, 0, 0, scene);
      playerRef.current = player;
spawnEnemyBH(C.LEVEL_ENEMY_MASS[1], C.LEVEL_ENEMY_SPEED[1]);
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

  // Handle upgrade purchase callbacks to trigger visual feedback
  useEffect(() => {
    if (!onPurchaseUpgrade || !playerRef.current) return;
    (window as any).__purchaseUpgrade = (type: 'mass' | 'speed', amount: number) => {
      playerRef.current?.triggerPurchasePulse(type, amount);
    };
  }, [onPurchaseUpgrade]);

  const onContextCreate = useCallback((gl: any) => {
    AudioManager.init();
    AudioManager.playBGM();
    const diffMult = DIFFICULTY[difficulty.toUpperCase() as keyof typeof DIFFICULTY] || DIFFICULTY.NORMAL;
    const { scene, camera, renderer, controls, diskMat, pullRing, pullRingMat, lensSphere, lensMat } = createSceneObjects(gl);
    sceneObjectsRef.current = { scene, camera, renderer, controls, diskMat, pullRing, pullRingMat, lensSphere, lensMat };

    const player = new Player(0, 0, 0, scene);
    playerRef.current = player;

    spawnEnemyBH(C.LEVEL_ENEMY_MASS[1], C.LEVEL_ENEMY_SPEED[1]);
    spawnFunctionsRef.current.spawnPlanet();
    spawnFunctionsRef.current.spawnPlanet();
    spawnFunctionsRef.current.spawnStar();

    let t = 0;
    let enemySpawnTimer = 0;

    const animate = () => {
      if (isPaused) return;
      t += C.FRAME_TIME;
      diskMat.uniforms.time.value = t;
      lensMat.uniforms.time.value = t;
      if (playerRef.current) {
        diskMat.uniforms.growthFlash.value = playerRef.current.growthFlash;
        playerRef.current.growthFlash = Math.max(0, playerRef.current.growthFlash - C.GROWTH_FLASH_DECAY);
        lensSphere.position.set(playerRef.current.pos.x, 0, playerRef.current.pos.z);
      }

      scene.children.forEach((c: any) => {
        if (c._ring) c.rotation.y += c._rs;
      });

      const dt = C.DELTA_TIME * simSpeed;
      const lvl = levelRef.current;
const diffMult = DIFFICULTY[difficulty.toUpperCase() as keyof typeof DIFFICULTY] || DIFFICULTY.NORMAL;
    const spawnInterval = (C.LEVEL_SPAWN_INTERVAL[lvl] || C.LEVEL_SPAWN_INTERVAL_DEFAULT) / diffMult.spawnRate;
    const maxEnemies = Math.round((C.LEVEL_MAX_ENEMIES[lvl] || C.LEVEL_MAX_DEFAULT) * diffMult.enemyCount / 3);
    const enemyMass = (C.LEVEL_ENEMY_MASS[lvl] || C.LEVEL_ENEMY_MASS_DEFAULT) * diffMult.enemyMass;
    const enemySpeed = (C.LEVEL_ENEMY_SPEED[lvl] || C.LEVEL_ENEMY_SPEED_DEFAULT) * diffMult.enemySpeed;
    const bodySpawnRate = (C.LEVEL_BODY_SPAWN_RATE[lvl] || C.LEVEL_BODY_SPAWN_RATE_DEFAULT) / diffMult.spawnRate;

      const p = playerRef.current;
      if (p && p.alive && gameStateRef.current === 'playing') {
        p.update(dt, keysRef.current, enemyBHsRef.current);
        onPlayerPosChange({ x: p.pos.x, y: p.pos.z });

        for (let i = bodiesRef.current.length - 1; i >= 0; i--) {
          const b = bodiesRef.current[i];
          const pullRadius = p.mass * C.GRAVITY_PULL_SCALE;
          b.inPullZone = b.mesh.position.distanceTo(p.pos) < pullRadius;
          if (b.inPullZone) {
            const dist = b.mesh.position.distanceTo(p.pos);
            const proximityFactor = 1 - Math.max(0, Math.min(1, (dist - b.radius) / (pullRadius - b.radius)));
            b.applyPullZoneTint(proximityFactor);
          } else if (b.wasInPullZone) {
            b.clearPullZoneTint();
          }
          b.wasInPullZone = b.inPullZone;
          // Tidal disruption stretch effect: bodies near player BH stretch toward it
          const tidalRange = p.radius * C.TIDAL_STRETCH_MAX_DISTANCE;
          const bodyDist = b.mesh.position.distanceTo(p.pos);
          if (bodyDist < tidalRange && bodyDist > 0) {
            const stretchFactor = 1.0 + (1.0 - bodyDist / tidalRange) * C.TIDAL_STRETCH_INTENSITY;
            // Stretch along the axis toward the player BH (X axis for simplicity)
            b.mesh.scale.set(stretchFactor, 1, 1);
            // Color shift toward tidal orange-red
            b.applyTidalTint(1.0 - bodyDist / tidalRange);
          } else {
            b.mesh.scale.set(1, 1, 1);
            if (b.wasInTidalZone) b.clearTidalTint();
          }
          b.wasInTidalZone = bodyDist < tidalRange;
          if (b.mesh.position.distanceTo(p.pos) < p.radius + b.radius) {
            AudioManager.playSFX('absorb');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (objectsAbsorbedCountRef.current === 0 && onFirstAbsorb && !hintFirstAbsorbRef.current) {
              hintFirstAbsorbRef.current = true;
              onFirstAbsorb();
            }
            p.grow(b.mass * C.MASS_ABSORB_RATIO);
            if (sceneObjectsRef.current && sceneObjectsRef.current.pullRing) {
              const newPullRadius = p.mass * C.GRAVITY_PULL_SCALE;
              sceneObjectsRef.current.pullRing.geometry.dispose();
              sceneObjectsRef.current.pullRing.geometry = new THREE.TorusGeometry(newPullRadius, 0.5, 8, 80);
            }
            scoreRef.current += Math.round(b.mass);
            bhMassRef.current += b.mass * C.BH_MASS_GROW_RATIO;
            objectsAbsorbedCountRef.current += 1;
            ringPulsesRef.current.push(createRingPulse(scene, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z));
            noReturnFlashesRef.current.push(createNoReturnFlash(scene, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z));
            b.dispose(scene);
            bodiesRef.current.splice(i, 1);
          }
        }

        const absorbed = p.absorbedMass;
        let newLevel = 1;
        for (let l = C.LEVEL_THRESHOLDS.length - 1; l >= 1; l--) {
          if (absorbed >= C.LEVEL_THRESHOLDS[l]) {
            newLevel = l;
            break;
          }
        }

        const nextThreshold = C.LEVEL_THRESHOLDS[levelRef.current + 1];
        if (nextThreshold !== undefined && absorbed >= nextThreshold * C.BIFURCATION_ZONE_RATIO) {
          bifurcationZoneRef.current = true;
          const distanceToThreshold = nextThreshold - absorbed;
          const thresholdRange = nextThreshold * (1 - C.BIFURCATION_ZONE_RATIO);
          bifurcationIntensityRef.current = Math.min(1, Math.max(0, 1 - distanceToThreshold / thresholdRange));
        } else {
          bifurcationZoneRef.current = false;
          bifurcationIntensityRef.current = 0;
        }

        if (newLevel > levelRef.current) {
          AudioManager.playSFX('levelup');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (onFirstLevelUp && !hintFirstLevelUpRef.current) {
            hintFirstLevelUpRef.current = true;
            onFirstLevelUp();
          }
          levelRef.current = newLevel;
          levelUpPendingRef.current = true;
          onLevelChange(newLevel);
          if (newLevel === C.LEVEL_THRESHOLDS.length - 1 && !maxLevelBurstFiredRef.current) {
            maxLevelBurstFiredRef.current = true;
            goldenBurstsRef.current.push(createGoldenBurst(scene, p.pos.x, p.pos.y, p.pos.z));
            if (playerRef.current) playerRef.current.growthFlash = 1.0;
          }
          levelUpFlashRef.current = 1.0;
        }
        if (absorbed >= C.WIN_MASS_THRESHOLD) {
          AudioManager.playSFX('win');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          AudioManager.stopBGM();
          gameStateRef.current = 'won';
          onGameStateChange('won');
          cameraAnimationRef.current = { active: true, targetDist: C.CAMERA_TARGET_DIST_WIN, duration: C.CAMERA_ANIM_DURATION_WIN, elapsed: 0, type: 'win' };
        }

        for (let i = enemyBHsRef.current.length - 1; i >= 0; i--) {
          const ebh = enemyBHsRef.current[i];
          if (!ebh.alive) {
            enemyBHsRef.current.splice(i, 1);
            continue;
          }
          ebh.update(dt, p.pos);
          const d = p.pos.distanceTo(ebh.mesh.position);
          if (d < p.radius + ebh.radius - C.PLAYER_HIT_RADIUS) {
            if (p.mass >= ebh.mass * C.LOSE_MASS_RATIO) {
              if (onFirstEnemyEncounter && !hintFirstEnemyRef.current) {
                hintFirstEnemyRef.current = true;
                onFirstEnemyEncounter();
              }
              AudioManager.playSFX('kill');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              p.grow(ebh.mass * C.MASS_GROW_ENEMY_RATIO);
              scoreRef.current += 500;
              enemyBHKilledRef.current += 1;
              ebh.dispose(scene);
              enemyBHsRef.current.splice(i, 1);
            } else {
              AudioManager.playSFX('death');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              AudioManager.stopBGM();
              if (onFirstDeath && !hintFirstDeathRef.current) {
                hintFirstDeathRef.current = true;
                onFirstDeath();
              }
              gameStateRef.current = 'lost';
              onGameStateChange('lost');
              cameraAnimationRef.current = { active: true, targetDist: C.CAMERA_TARGET_DIST_LOSS, duration: C.CAMERA_ANIM_DURATION_LOSS, elapsed: 0, type: 'loss' };
              p.alive = false;
              // Ghost echo — save player's largest moment as fading silhouette
              if (p && p.mesh) {
                const ghostMat = new THREE.MeshBasicMaterial({
                  color: 0x333333,
                  transparent: true,
                  opacity: 1.0,
                  blending: THREE.AdditiveBlending,
                });
                const ghostMesh = new THREE.Mesh(p.mesh.geometry.clone(), ghostMat);
                ghostMesh.position.copy(p.pos);
                ghostMesh.scale.copy(p.mesh.scale);
                scene.add(ghostMesh);
                const glowTex = createGlowTexture(0x333333, 0.5);
                const ghostGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
                ghostGlow.scale.setScalar(p.radius * 4);
                ghostGlow.position.copy(p.pos);
                scene.add(ghostGlow);
                ghostEchoRef.current = { mesh: ghostMesh, glow: ghostGlow };
                ghostFadeRef.current = 1.0;
              }
            }
          }
        }

        enemySpawnTimer += dt;
        if (enemySpawnTimer > spawnInterval && enemyBHsRef.current.length < maxEnemies) {
          spawnEnemyBH(enemyMass, enemySpeed);
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
        level: levelRef.current,
        objectsAbsorbedCount: objectsAbsorbedCountRef.current,
        enemyBHKilled: enemyBHKilledRef.current,
      });

      // Update spawn warnings (visual indicator for incoming enemy BHs)
      const currentTime = performance.now() / 1000;
      updateSpawnWarnings(spawnWarningsRef.current, scene, currentTime);
      updateGoldenBursts(goldenBurstsRef.current, scene, currentTime);
      updateRingPulses(ringPulsesRef.current, scene, currentTime);

      if (bifurcationZoneRef.current && p) {
        bifurcationSonarTimerRef.current += dt;
        if (bifurcationSonarTimerRef.current >= C.BIFURCATION_SONAR_INTERVAL) {
          bifurcationPulsesRef.current.push(createBifurcationPulse(scene, p.pos.x, p.pos.y, p.pos.z, p.radius));
          bifurcationSonarTimerRef.current = 0;
        }
      }
      updateBifurcationPulses(bifurcationPulsesRef.current, scene, currentTime, p ? p.radius : 8);
      updateNoReturnFlashes(noReturnFlashesRef.current, scene, currentTime);

      if (bifurcationZoneRef.current && sceneObjectsRef.current) {
        const shake = Math.sin(performance.now() * 0.03) * C.BIFURCATION_SHAKE_INTENSITY * bifurcationIntensityRef.current;
        cameraShakeOffsetRef.current.x += shake;
        cameraShakeOffsetRef.current.y += shake * 0.5;
      }

      if (cameraShakeOffsetRef.current.x !== 0 || cameraShakeOffsetRef.current.y !== 0) {
        sceneObjectsRef.current.camera.position.x += cameraShakeOffsetRef.current.x;
        sceneObjectsRef.current.camera.position.y += cameraShakeOffsetRef.current.y;
        cameraShakeOffsetRef.current.x = 0;
        cameraShakeOffsetRef.current.y = 0;
      }

      if (levelUpFlashRef.current > 0) {
        levelUpFlashRef.current -= dt * 3;
      }

      // Update camera animation if active
      if (cameraAnimationRef.current.active && sceneObjectsRef.current) {
        const camAnim = cameraAnimationRef.current;
        const dt_anim = C.DELTA_TIME * simSpeed;
        camAnim.elapsed += dt_anim;
        const progress = Math.min(camAnim.elapsed / camAnim.duration, 1.0);
        const startDist = controls.dist;
        controls.dist = startDist + (camAnim.targetDist - startDist) * progress;
        controls.update();
        
        // Update overlay opacity
        const opacity = progress * C.OVERLAY_OPACITY_FINAL;
        onOverlayOpacityChange(opacity, camAnim.type);
        
        if (progress >= 1.0) {
          camAnim.active = false;
        }
      }

      // Report zoom level to UI (0 = min zoom in, 1 = max zoom out)
      if (sceneObjectsRef.current) {
        const zoomLevel = (sceneObjectsRef.current.controls.dist - C.ZOOM_CALC_MIN) / C.ZOOM_CALC_DENOM;
        onZoomLevelChange(Math.max(0, Math.min(1, zoomLevel)));
      }

      // Update ghost echo fade
      if (ghostEchoRef.current) {
        ghostFadeRef.current -= dt * 0.1;
        if (ghostFadeRef.current <= 0) {
          scene.remove(ghostEchoRef.current.mesh);
          scene.remove(ghostEchoRef.current.glow);
          ghostEchoRef.current = null;
        } else {
          const m = ghostEchoRef.current.mesh;
          const g = ghostEchoRef.current.glow;
          (m.material as THREE.MeshBasicMaterial).opacity = ghostFadeRef.current;
          (g.material as THREE.SpriteMaterial).opacity = ghostFadeRef.current * 0.5;
        }
      }

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
  }, [simSpeed, onStatsChange, onGameStateChange, onPlayerPosChange, onLevelChange, onZoomLevelChange, onOverlayOpacityChange, spawnEnemyBH, onPurchaseUpgrade]);

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