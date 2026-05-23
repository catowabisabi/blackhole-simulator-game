/**
 * Black Hole Simulator - Game Constants
 * Extracted magic numbers from Scene.tsx and App.tsx
 */

// ============================================================================
// PHYSICS
// ============================================================================
export const BH_MASS = 12000;                    // Central black hole mass
export const BH_RADIUS = 22;                    // Central black hole visual radius
export const G = 14;                             // Gravitational constant
export const PLAYER_INITIAL_MASS = 40;          // Player starting mass
export const PLAYER_INITIAL_RADIUS = 8;         // Player starting radius
export const PLAYER_SPEED = 180;                // Player movement speed
export const PLAYER_BOUNDS = 280;               // Player movement bounds
export const PLAYER_HIT_RADIUS = 6;            // Player collision hitbox reduction
export const ENEMY_BH_MASS = 15000;             // Base enemy black hole mass

// ============================================================================
// GAMEPLAY
// ============================================================================
export const WIN_MASS_THRESHOLD = 50000;        // Mass needed to win
export const LOSE_MASS_RATIO = 1.2;            // Must be this much bigger than enemy to kill

// Level system thresholds (mass required for each level)
export const LEVEL_THRESHOLDS = [0, 10000, 25000, 45000, 75000, 120000];
export const LEVEL_ENEMY_MASS = [0, 15000, 22000, 32000, 48000, 70000];
export const LEVEL_ENEMY_SPEED = [0, 55, 75, 100, 130, 170];
export const LEVEL_SPAWN_INTERVAL = [0, 10, 7, 5, 3.5, 2.5];       // Seconds between enemy spawns per level
export const LEVEL_MAX_ENEMIES = [0, 2, 3, 4, 5, 6];
export const LEVEL_BODY_SPAWN_RATE = [0, 6, 4.5, 3, 2, 1.5];       // Body spawn rate multiplier per level

// Mass absorption ratios
export const MASS_ABSORB_RATIO = 0.15;          // % of body mass absorbed by player
export const MASS_GROW_ENEMY_RATIO = 0.3;      // % of enemy mass added to player on kill
export const BH_MASS_GROW_RATIO = 0.05;        // % of absorbed mass added to central BH
export const SCORE_ENEMY_KILL = 500;           // Score points for killing enemy BH

// Player physics
export const PLAYER_VELOCITY_DECAY = 0.85;    // Velocity damping when not moving
export const GROWTH_FLASH_RESET = 1.0;        // Initial growth flash value
export const GROWTH_FLASH_DECAY = 0.03;       // Growth flash decay per frame

// ============================================================================
// DIFFICULTY
// ============================================================================
export const DIFFICULTY = {
  EASY: { spawnRate: 0.7, enemyCount: 2, enemyMass: 0.7, enemySpeed: 0.8 },
  NORMAL: { spawnRate: 1.0, enemyCount: 3, enemyMass: 1.0, enemySpeed: 1.0 },
  HARD: { spawnRate: 1.3, enemyCount: 5, enemyMass: 1.4, enemySpeed: 1.3 },
} as const;

// ============================================================================
// CAMERA & RENDERING
// ============================================================================
export const FOV = 60;                          // Camera field of view
export const CAMERA_NEAR = 1;                   // Camera near plane
export const CAMERA_FAR = 3000;                 // Camera far plane
export const CAMERA_DIST_INITIAL = 420;        // Initial camera distance
export const CAMERA_DIST_MIN = 60;             // Minimum camera distance (max zoom in)
export const CAMERA_DIST_MAX = 1400;           // Maximum camera distance (max zoom out)
export const CAMERA_ANGLE_SENSITIVITY = 0.006; // Mouse/touch rotation sensitivity
export const CAMERA_PHI_MIN = 0.15;            // Minimum polar angle
export const CAMERA_PHI_MAX = Math.PI - 0.15;  // Maximum polar angle

// Zoom calculation
export const ZOOM_MIN = 0;                     // Minimum zoom level
export const ZOOM_MAX = 1;                     // Maximum zoom level
export const ZOOM_CALC_MIN = 60;               // Camera dist corresponding to zoom 0
export const ZOOM_CALC_DENOM = 1340;           // Denominator for zoom calculation (CAMERA_DIST_MAX - ZOOM_CALC_MIN)

// Camera animation
export const CAMERA_ANIM_DURATION_WIN = 2.5;   // Win camera animation duration (seconds)
export const CAMERA_ANIM_DURATION_LOSS = 2.0;  // Loss camera animation duration (seconds)
export const CAMERA_TARGET_DIST_WIN = 2000;    // Target camera distance on win
export const CAMERA_TARGET_DIST_LOSS = 60;     // Target camera distance on loss
export const OVERLAY_OPACITY_FINAL = 0.9;      // Final overlay opacity

// ============================================================================
// SPAWNING
// ============================================================================
export const SPAWN_DIST_MIN = 800;             // Minimum spawn distance for enemies
export const SPAWN_DIST_MAX = 1200;            // Maximum spawn distance for enemies
export const SPAWN_SPREAD_ANGLE = 0.7;         // Spawn angle spread (Math.PI * 0.7 = ~90 degree cone)
export const SPAWN_WARNING_RADIUS = 30;        // Spawn warning ring radius
export const SPAWN_WARNING_DURATION = 2.0;     // Spawn warning duration (seconds)
export const SPAWN_WARNING_SEGMENTS = 32;       // Spawn warning ring segments

// Enemy BH
export const ENEMY_BH_RADIUS_BASE = 18;        // Base enemy BH radius
export const ENEMY_BH_RADIUS_MASS_DIVISOR = 1500; // Radius = 10 + mass / 1500
export const ENEMY_BH_SPEED_BASE = 60;         // Base enemy BH speed
export const ENEMY_BH_FORCE_TO_PLAYER = 20;    // Force pulling toward player
export const ENEMY_BH_RING_RADIUS_MULT = 1.6;  // Ring radius = radius * 1.6
export const ENEMY_BH_RING_THICKNESS = 1.0;    // Ring thickness
export const ENEMY_BH_RING_ROTATION_SPEED = 0.02; // Ring rotation speed
export const ENEMY_BH_SIGHTING_RADIUS = 0.1;
export const GRAVITY_PULL_SCALE = 0.005;   // Minimum distance to start moving toward player

// Spawn orbit velocities
export const SPAWN_ORBIT_SPEED_BASE = 0.85;    // Base orbital speed multiplier
export const SPAWN_ORBIT_SPEED_VAR = 0.3;      // Orbital speed random variation
export const SPAWN_VELOCITY_SCALE = 0.9;       // Velocity scaling factor
export const SPAWN_VELOCITY_VAR = 0.2;         // Velocity random variation
export const SPAWN_VERTICAL_VAR = 0.15;        // Vertical velocity variation
export const SPAWN_ENEMY_INITIAL_DELAY = 0;     // Initial delay before enemy spawns
export const SPAWN_COMET_SPEED_BOOST = 5;      // Additional speed for comets
export const SPAWN_STAR_SPEED_BOOST = 2;       // Additional speed for stars

// Spawn distances for bodies
export const SPAWN_PLANET_MIN = 120;           // Planet spawn distance min
export const SPAWN_PLANET_MAX = 200;           // Planet spawn distance max
export const SPAWN_STAR_MIN = 200;             // Star spawn distance min
export const SPAWN_STAR_MAX = 180;              // Star spawn distance max
export const SPAWN_COMET_X_BASE = 350;         // Comet X spawn base distance
export const SPAWN_COMET_X_VAR = 80;           // Comet X spawn variation
export const SPAWN_COMET_Y_RANGE = 100;       // Comet Y spawn range
export const SPAWN_COMET_Z_RANGE = 350;        // Comet Z spawn range

// ============================================================================
// RENDERING / VISUALS
// ============================================================================
export const TAIL = 80;                         // Trail point count

// Star visuals
export const STAR_GLOW_INTENSITY = 8;
export const STAR_GLOW_RADIUS_MULT = 40;
export const STAR_GLOW_SCALE = 7;
export const STAR_GLOW_OPACITY_START = 0.6;
export const STAR_SHININESS = 60;               // Star shininess
export const STAR_EMISSIVE_MULT = 0.35;         // Emissive color multiplier

// Sphere geometry segments
export const SPHERE_SEGMENTS = 24;              // Regular body sphere segments
export const ENEMY_SPHERE_SEGMENTS = 32;        // Enemy BH sphere segments
export const BH_SPHERE_SEGMENTS = 64;           // Central BH sphere segments
export const RING_SEGMENTS = 80;                // Ring geometry segments

// Body masses and radii
export const BODY_MASS_PLANET_MIN = 25;         // Planet mass minimum
export const BODY_MASS_PLANET_VAR = 20;         // Planet mass variation
export const BODY_RADIUS_PLANET_MIN = 7;        // Planet radius minimum
export const BODY_RADIUS_PLANET_VAR = 5;       // Planet radius variation
export const BODY_MASS_STAR_MIN = 80;           // Star mass minimum
export const BODY_MASS_STAR_VAR = 60;           // Star mass variation
export const BODY_RADIUS_STAR_MIN = 12;         // Star radius minimum
export const BODY_RADIUS_STAR_VAR = 7;          // Star radius variation
export const BODY_MASS_COMET = 8;               // Comet mass
export const BODY_RADIUS_COMET = 4;             // Comet radius

// Background ring (accretion disk)
export const BG_RING_COLORS = [0xff4488, 0xff6622, 0xffaa00];
export const BG_RING_RADII = [1.3, 1.8, 2.3];         // Ring radii relative to BH_RADIUS
export const BG_RING_THICKNESS = [1.5, 1.2, 0.9];        // Ring thickness
export const BG_RING_OPACITY_START = 0.6;               // Starting ring opacity
export const BG_RING_OPACITY_DECAY = 0.1;               // Opacity decay per ring
export const BG_RING_ROTATION_OFFSET = 0.08;            // Rotation offset per ring
export const RING_ROTATION_SPEED_BASE = 0.008;          // Base ring rotation speed

// Player glow
export const PLAYER_GLOW_OPACITY = 0.4;        // Player glow sprite opacity
export const PLAYER_GLOW_SCALE = 5;            // Player glow scale multiplier

// Pull zone visual tint
export const PULL_ZONE_TINT = 0xff6622;       // Warm orange tint for bodies in pull zone
export const PULL_ZONE_EMISSIVE_STRENGTH = 0.4; // Emissive lerp factor for planets (0-1)
export const PULL_ZONE_GLOW_MIN = 0.1;         // Star glow opacity at edge of pull zone
export const PULL_ZONE_GLOW_MAX = 0.3;         // Star glow opacity at closest proximity

// Golden burst (max level celebration)
export const GOLDEN_BURST_COLOR = 0xffd700;   // Gold color for particles
export const GOLDEN_BURST_PARTICLE_COUNT = 40; // Number of particles in burst
export const GOLDEN_BURST_DURATION = 1.5;     // Burst animation duration in seconds
export const GOLDEN_BURST_RADIUS = 15;        // Initial burst radius
export const GOLDEN_BURST_SPREAD = 50;        // How far particles travel

// Disk shader
export const DISK_SHADER_R_SCALE = 12;          // Disk plane geometry scale relative to BH_RADIUS
export const DISK_SHADER_RINGS = 18;            // Number of rings in shader pattern
export const DISK_SHADER_SPEED = 3.0;           // Shader animation speed
export const DISK_SHADER_BRIGHTNESS = 0.5;      // Brightness mix factor

// Star field
export const STAR_FIELD_COUNT = 6000;          // Number of background stars
export const STAR_FIELD_SPREAD = 3000;         // Star field spread radius
export const STAR_SIZE = 0.8;                  // Background star size

// Fog
export const FOG_DENSITY = 0.0005;             // Exponential fog density

// Pixel ratio
export const PIXEL_RATIO_IOS = 3;              // iOS pixel ratio max
export const PIXEL_RATIO_ANDROID = 2;           // Android pixel ratio max

// ============================================================================
// COLORS (hex values)
// ============================================================================
export const ENEMY_COLOR = 0x220033;
export const ENEMY_RING_COLOR = 0xff00ff;
export const ENEMY_RING_OPACITY_START = 0.5;
export const BH_COLOR = 0x000000;               // Central BH color
export const PLAYER_COLOR = 0x00ffaa;           // Player mesh color
export const BACKGROUND_STAR_COLOR = 0xffffff; // Background star color
export const AMBIENT_LIGHT_COLOR = 0x111133;    // Ambient light color
export const POINT_LIGHT_COLOR = 0xff6699;      // Point light color
export const FOG_COLOR = 0x000008;              // Scene fog color

// Body colors (arrays)
export const PLANET_COLORS = [0x44ff88, 0x88aaff, 0xff8844, 0xaaffcc, 0xff44aa];
export const STAR_COLORS = [0xffffff, 0xffeeaa, 0xaaccff, 0xffaa66];
export const COMET_COLOR = 0xaaddff;

// ============================================================================
// TOUCH CONTROLS
// ============================================================================
export const TOUCH_SENSITIVITY = 1.5;           // Pinch zoom sensitivity multiplier
export const TOUCH_MAX_DELTA = 80;             // Maximum touch delta for normalization
export const TOUCH_DEADZONE = 0.3;             // Touch input deadzone threshold

// ============================================================================
// TIMING / ANIMATION
// ============================================================================
export const DELTA_TIME = 0.35;                  // Base delta time multiplier
export const FRAME_TIME = 0.016;               // Approximate frame time (60fps)

// ============================================================================
// LEVEL DEFAULTS (fallback values)
// ============================================================================
export const LEVEL_UP_COUNT = 1;                // Number of levels to advance on threshold
export const LEVEL_MAX_DEFAULT = 6;             // Default max enemies
export const LEVEL_BODY_SPAWN_RATE_DEFAULT = 1.5; // Default body spawn rate
export const LEVEL_SPAWN_INTERVAL_DEFAULT = 2.5; // Default spawn interval
export const LEVEL_ENEMY_MASS_DEFAULT = 70000;  // Default enemy mass fallback
export const LEVEL_ENEMY_SPEED_DEFAULT = 170;   // Default enemy speed fallback

// ============================================================================
// SPAWN WARNING ANIMATION
// ============================================================================
export const SPAWN_WARNING_OPACITY_START = 0.9;  // Warning ring starting opacity
export const SPAWN_WARNING_SCALE_START = 1.0;   // Warning ring starting scale
export const SPAWN_WARNING_SCALE_GROWTH = 0.5;  // Warning ring scale growth
export const SPAWN_WARNING_ROTATION_SPEED = 0.05; // Warning ring rotation speed

// ============================================================================
// DISTANCE CALCULATIONS
// ============================================================================
export const MIN_DISTANCE = 0.1;                // Minimum distance for velocity calculations
export const MIN_BH_DISTANCE = 1;              // Minimum BH distance for gravity calc
export const MIN_BODY_DISTANCE = 10;           // Minimum body distance for gravity calc