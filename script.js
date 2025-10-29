/*
  Geometry Dash - estilo minimal
  Mueve un cuadrado que corre y salta sobre obstáculos.
  Controles: click / touch / Space para saltar, R para reiniciar.
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Tamaño base (estático visual) y ajuste para devicePixelRatio
const WIDTH = 800;
const HEIGHT = 450;

function resizeCanvas() {
  const DPR = window.devicePixelRatio || 1;
  canvas.style.width = WIDTH + 'px';
  canvas.style.height = HEIGHT + 'px';
  canvas.width = Math.floor(WIDTH * DPR);
  canvas.height = Math.floor(HEIGHT * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mundo
const groundY = 380;
let gameSpeed = 5; // velocidad de desplazamiento de los obstáculos
let score = 0;
let highScore = 0;
let running = true;

// Jugador (cuadrado)
const player = {
  x: 120,
  size: 42,
  y: groundY - 42,
  prevY: groundY - 42,
  vy: 0,
  gravity: 0.9,
  jumpPower: -15,
  onGround: true,
  color: '#00d1ff'
};

// Obstáculos
let obstacles = [];
let spawnTimer = 0;
const spawnInterval = 90; // frames between spawns (aprox)

// ### 🌋 VOLCANIC BACKGROUND ELEMENTS ###
const MAX_PARTICLES = 150; // How many ash particles
let particles = []; // Array to hold particle objects
// ### 🎨 AESTHETIC TRANSITION VARIABLES ###
let currentAestheticIndex = 0;
let nextAestheticIndex = 0; // The palette we are transitioning TO
let isTransitioning = false;
let transitionProgress = 0; // 0.0 to 1.0
const TRANSITION_DURATION_MS = 3000; // 3 seconds
let transitionStartTime = 0;
let lastScoreMilestone = 0;

// Define palettes in an array for easier access
const palettes = [
  { // 0: "Smoky Night"
    skyTop: '#0a0111',
    skyBottom: '#2a0845',
    ground: '#1a1a1a',
    fissure: '#ff4000',
    particle: 'rgba(200, 180, 180, 0.4)',
    volcano: '#1f0322'
  },
  { // 1: "Eruption Inferno"
    skyTop: '#4d0000',
    skyBottom: '#b30000',
    ground: '#2b0f00',
    fissure: '#ffff00',
    particle: 'rgba(50, 50, 50, 0.6)',
    volcano: '#3d0000'
  },
  { // 2: "Toxic Haze"
    skyTop: '#2b3a1a',
    skyBottom: '#576d3a',
    ground: '#2f2f2f',
    fissure: '#00ff00',
    particle: 'rgba(200, 255, 200, 0.3)',
    volcano: '#1a2012'
  },
  { // 3: "Nebula Night"
    skyTop: '#0f0f2b',
    skyBottom: '#3c1a4b',
    ground: '#0b0c10',
    fissure: '#00f2ff',
    particle: 'rgba(220, 220, 255, 0.4)',
    volcano: '#07071a'
  }
];

// This will hold the parsed {r,g,b,a} objects for smooth lerping
let parsedPalettes = [];
// ### END AESTHETIC VARIABLES ###
let volcanoes = []; // Array to hold distant volcano objects
const VOLCANO_LAYERS = 3; // Number of parallax layers for volcanoes
// ### END BACKGROUND ELEMENTS ###

/**
 * Creates or resets all background elements (particles and volcanoes).
 * Called at the start and on restart.
 */
function initBackground() {
  // Create ash particles
  particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 0.5 + Math.random() * 1.5, // Vertical fall speed
      drift: -0.3 + Math.random() * 0.6, // Horizontal drift
      size: 1 + Math.random() * 2.5
    });
  }

  // Create distant volcanoes in parallax layers
  volcanoes = [];
  for (let layer = 0; layer < VOLCANO_LAYERS; layer++) {
    const layerVolcanoes = [];
    // Closer layers have fewer, larger volcanoes
    const count = 5 - layer;
    const parallaxFactor = 0.1 + (layer / VOLCANO_LAYERS) * 0.4; // 0.1 (far) to 0.5 (near)
    const baseHeight = 40 + layer * 30;
    const width = 200 + layer * 80;

    for (let i = 0; i < count; i++) {
      layerVolcanoes.push({
        // Spread them out across a wider-than-screen area to avoid pop-in
        x: (i * (WIDTH / (count - 1))) + Math.random() * 200 - 100,
        w: width + Math.random() * 70,
        h: baseHeight + Math.random() * 50,
        parallax: parallaxFactor
      });
    }
    volcanoes.push(layerVolcanoes);
  }
}

// ### 🎨 COLOR INTERPOLATION HELPERS ###

/** Linear interpolation (lerp) for a single number */
function lerp(a, b, t) {
  // Clamp t to be between 0 and 1
  const progress = Math.max(0, Math.min(1, t));
  return a + (b - a) * progress;
}

/** Parses a color string (hex or rgba) into an {r, g, b, a} object */
function parseColor(colorStr) {
  if (colorStr.startsWith('rgba')) {
    const parts = colorStr.match(/[\d.]+/g);
    return {
      r: parseFloat(parts[0]),
      g: parseFloat(parts[1]),
      b: parseFloat(parts[2]),
      a: parseFloat(parts[3])
    };
  }
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const val = parseInt(hex, 16);
    return {
      r: (val >> 16) & 255,
      g: (val >> 8) & 255,
      b: val & 255,
      a: 1
    };
  }
  // Fallback for unhandled
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Formats an {r, g, b, a} object back into an "rgba(r,g,b,a)" string */
function rgbaToString(colorObj) {
  return `rgba(${Math.round(colorObj.r)}, ${Math.round(colorObj.g)}, ${Math.round(colorObj.b)}, ${colorObj.a})`;
}

/** Lerps between two {r, g, b, a} color objects */
function lerpColorObjects(colorA, colorB, t) {
  return {
    r: lerp(colorA.r, colorB.r, t),
    g: lerp(colorA.g, colorB.g, t),
    b: lerp(colorA.b, colorB.b, t),
    a: lerp(colorA.a, colorB.a, t)
  };
}

/**
 * Parses the string-based palettes into {r,g,b,a} objects
 * for faster processing in the draw loop.
 */
function initPalettes() {
  parsedPalettes = palettes.map(p => ({
    skyTop: parseColor(p.skyTop),
    skyBottom: parseColor(p.skyBottom),
    ground: parseColor(p.ground),
    fissure: parseColor(p.fissure),
    particle: parseColor(p.particle),
    volcano: parseColor(p.volcano)
  }));
}
// ### END COLOR HELPERS ###

/**
 * Updates positions of background elements every frame.
 */
function updateBackground() {
  if (!running) return;

  // Update particles (ash)
  particles.forEach(p => {
    p.y += p.speed; // Fall down
    p.x += p.drift; // Drift sideways
    
    // Wrap particles around the screen
    if (p.y > HEIGHT + 10) {
      p.y = -10; // Reset to top
      p.x = Math.random() * WIDTH;
    }
    if (p.x < -10) p.x = WIDTH + 10;
    if (p.x > WIDTH + 10) p.x = -10;
  });

  // Update volcano positions (parallax scroll)
  volcanoes.forEach(layer => {
    layer.forEach(v => {
      // Move based on gameSpeed and its parallax factor
      v.x -= gameSpeed * v.parallax;
      
      // Wrap volcanoes when they scroll off-screen
      if (v.x + v.w < -150) {
        v.x = WIDTH + 150 + Math.random() * 100; // Reset to the right
      }
    });
  });
}

// Input
function jump() {
  if (player.onGround && running) {
    player.vy = player.jumpPower;
    player.onGround = false;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
  if (e.key === 'r' || e.key === 'R') {
    restart();
  }
});

canvas.addEventListener('mousedown', () => jump());
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jump(); }, {passive:false});

// Genera un obstáculo (bloque o pinchos)
function createObstacle() {
  const type = Math.random() < 0.25 ? 'spike' : 'block';
  const width = type === 'block' ? 40 + Math.floor(Math.random() * 40) : 36;
  const height = type === 'block' ? 30 + Math.floor(Math.random() * 80) : 36;
  const y = type === 'block' ? (groundY - height) : (groundY - height);

  obstacles.push({
    x: WIDTH + 60,
    y,
    w: width,
    h: height,
    type
  });
}

// Colisión AABB simple
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
    updateBackground();
  if (!running) return;

  // ### 🎨 AESTHETIC TRANSITION LOGIC ###
  const now = performance.now();
  
  // 1. Check if we are currently transitioning
  if (isTransitioning) {
    const elapsed = now - transitionStartTime;
    transitionProgress = Math.min(elapsed / TRANSITION_DURATION_MS, 1.0);

    // 2. Check if the transition has finished
    if (transitionProgress >= 1.0) {
      isTransitioning = false;
      currentAestheticIndex = nextAestheticIndex; // Lock in the new palette
      transitionProgress = 0; // Reset progress
    }
  }

  // 3. Check if a *new* transition should start
  const currentMilestone = Math.floor(score / 20); // Trigger every 50 points
  if (currentMilestone > lastScoreMilestone && !isTransitioning) {
    isTransitioning = true;
    transitionStartTime = now;
    lastScoreMilestone = currentMilestone;
    // Set the next palette, wrapping around if we're at the end
    nextAestheticIndex = (currentAestheticIndex + 1) % palettes.length;
    transitionProgress = 0; // Ensure progress starts from 0
  }
  // ### END AESTHETIC LOGIC ###
  // track previous vertical position to detect landing-from-above
  player.prevY = player.y;

  // Actualiza jugador
  player.vy += player.gravity;
  player.y += player.vy;

  // Ground collision
  if (player.y + player.size >= groundY) {
    player.y = groundY - player.size;
    player.vy = 0;
    player.onGround = true;
  }

  // Spawning
  spawnTimer++;
  if (spawnTimer > spawnInterval) {
    spawnTimer = 0;
    createObstacle();
  }

  // Mover obstáculos
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= gameSpeed;
    // Offscreen
    if (ob.x + ob.w < -50) obstacles.splice(i, 1);
    // Check collision (approx spikes as box for simplicity)
    const playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
    const obBox = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
    if (rectsOverlap(playerBox, obBox)) {
      if (ob.type === 'spike') {
        // contact with spikes is always lethal
        gameOver();
      } else if (ob.type === 'block') {
        // Determine if the player is landing on top of the block.
        // Use previous vertical position to confirm the player came from above.
        const prevBottom = player.prevY + player.size;
        const currBottom = player.y + player.size;
        const obTop = ob.y;

        // If the player's previous bottom was at or above the block top (<=) and
        // now the bottom is at or below the block top (>=), and the player is moving down,
        // treat this as a safe landing on top of the block.
        if (prevBottom <= obTop && currBottom >= obTop && player.vy >= 0) {
          // Snap the player to the top of the block and reset vertical motion
          player.y = obTop - player.size;
          player.vy = 0;
          player.onGround = true;
        } else {
          // Any other overlap (side, bottom, or hitting while moving up) is lethal
          gameOver();
        }
      } else {
        // fallback: lethal
        gameOver();
      }
    }
  }

  // Increment score by distance / time
  score += 0.1 * (gameSpeed / 5);

  // Slight difficulty ramp
  if (Math.floor(score) % 50 === 0 && Math.floor(score) !== 0) {
    gameSpeed = 5 + Math.floor(score / 100);
  }
}

function draw() {
  // ### 🌋 VOLCANIC BACKGROUND DRAWING ###

  // 1. Get the 'from' and 'to' palettes
  const paletteA = parsedPalettes[currentAestheticIndex];
  const paletteB = parsedPalettes[nextAestheticIndex];
  const t = transitionProgress; // Current blend amount (0.0 to 1.0)

  // 2. Interpolate all colors
  const skyTop = lerpColorObjects(paletteA.skyTop, paletteB.skyTop, t);
  const skyBottom = lerpColorObjects(paletteA.skyBottom, paletteB.skyBottom, t);
  const ground = lerpColorObjects(paletteA.ground, paletteB.ground, t);
  const fissure = lerpColorObjects(paletteA.fissure, paletteB.fissure, t);
  const particle = lerpColorObjects(paletteA.particle, paletteB.particle, t);
  const volcano = lerpColorObjects(paletteA.volcano, paletteB.volcano, t);

  // 3. Convert interpolated {r,g,b,a} objects back to strings for drawing
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, rgbaToString(skyTop));
  skyGrad.addColorStop(1, rgbaToString(skyBottom));

  const groundColor = rgbaToString(ground);
  const fissureColor = rgbaToString(fissure);
  const particleColor = rgbaToString(particle);
  const distantVolcanoColor = rgbaToString(volcano);

  // 4. Draw Sky
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 5. Draw Distant Volcanoes (Parallax) - THIS WAS MISSING
  volcanoes.forEach((layer, index) => {
    // Set color and alpha based on layer
    ctx.fillStyle = distantVolcanoColor;
    ctx.globalAlpha = 0.2 + (index / VOLCANO_LAYERS) * 0.5; // Fainter layers are further
    
    layer.forEach(v => {
      // Draw a simple triangle for the volcano silhouette
      ctx.beginPath();
      ctx.moveTo(v.x, groundY);
      ctx.lineTo(v.x + v.w / 2, groundY - v.h);
      ctx.lineTo(v.x + v.w, groundY);
      ctx.closePath();
      ctx.fill();
    });
  });
  ctx.globalAlpha = 1.0; // Reset alpha

  // 6. Draw Ash/Particles - THIS WAS MISSING
  ctx.fillStyle = particleColor;
  particles.forEach(p => {
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  // 7. Draw Ground
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);


  // ### END OF BACKGROUND ###

  // -- THE OLD CODE BELOW WAS REMOVED --
  // ctx.fillStyle = '#0b2a3a';
  // ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);
  // ... (and the grid lines) ...
  // --

  // Draw player (square)
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Draw obstacles
  obstacles.forEach(ob => {
    if (ob.type === 'block') {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      // top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(ob.x, ob.y, ob.w, 6);
    } else if (ob.type === 'spike') {
      // draw spikes as triangle shapes
      ctx.fillStyle = '#ffd166';
      const spikeW = ob.w;
      const spikeH = ob.h;
      const spikeCount = Math.max(2, Math.floor(spikeW / 12));
      const step = spikeW / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
        const sx = ob.x + i * step;
        ctx.beginPath();
        ctx.moveTo(sx, ob.y + spikeH);
        ctx.lineTo(sx + step / 2, ob.y);
        ctx.lineTo(sx + step, ob.y + spikeH);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  // UI: Score
  ctx.fillStyle = 'white';
  ctx.font = '18px Arial';
  ctx.fillText('Score: ' + Math.floor(score), 12, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('High: ' + Math.floor(highScore), 12, 50);

  if (!running) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', WIDTH / 2, HEIGHT / 2 - 10);
    ctx.font = '16px Arial';
    ctx.fillText('Press R or Click to restart', WIDTH / 2, HEIGHT / 2 + 18);
    ctx.textAlign = 'start';
  }
}

function gameOver() {
  running = false;
  if (score > highScore) highScore = Math.floor(score);
}

function restart() {
  // reset
  running = true;
  score = 0;
  obstacles = [];
  spawnTimer = 0;
  player.y = groundY - player.size;
  player.vy = 0;
  player.onGround = true;
  gameSpeed = 5;
  initBackground();

  // Reset aesthetic state
  currentAestheticIndex = 0;
  nextAestheticIndex = 0;
  isTransitioning = false;
  transitionProgress = 0;
  lastScoreMilestone = 0;
}

canvas.addEventListener('click', () => { if (!running) restart(); });

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initBackground();
initPalettes();
loop();
