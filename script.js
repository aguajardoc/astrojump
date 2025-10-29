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
const spawnInterval = 90;

// ### 🌋 VOLCANIC BACKGROUND ELEMENTS ###
const MAX_PARTICLES = 150;
let particles = [];
let currentAestheticIndex = 0;
let nextAestheticIndex = 0;
let isTransitioning = false;
let transitionProgress = 0;
const TRANSITION_DURATION_MS = 3000;
let transitionStartTime = 0;
let lastScoreMilestone = 0;

// Paletas de color
const palettes = [
  {
    // 0: "Smoky Night"
    skyTop: "#0a0111",
    skyBottom: "#2a0845",
    ground: "#1a1a1a",
    fissure: "#ff4000",
    particle: "rgba(200, 180, 180, 0.4)",
    volcano: "#1f0322",
  },
  {
    // 1: "Eruption Inferno"
    skyTop: "#4d0000",
    skyBottom: "#b30000",
    ground: "#2b0f00",
    fissure: "#ffff00",
    particle: "rgba(50, 50, 50, 0.6)",
    volcano: "#3d0000",
  },
  {
    // 2: "Toxic Haze"
    skyTop: "#2b3a1a",
    skyBottom: "#576d3a",
    ground: "#2f2f2f",
    fissure: "#00ff00",
    particle: "rgba(200, 255, 200, 0.3)",
    volcano: "#1a2012",
  },
  {
    // 3: "Nebula Night"
    skyTop: "#0f0f2b",
    skyBottom: "#3c1a4b",
    ground: "#0b0c10",
    fissure: "#00f2ff",
    particle: "rgba(220, 220, 255, 0.4)",
    volcano: "#07071a",
  },
  { skyTop: '#0a0111', skyBottom: '#2a0845', ground: '#1a1a1a', fissure: '#ff4000', particle: 'rgba(200,180,180,0.4)', volcano: '#1f0322' },
  { skyTop: '#4d0000', skyBottom: '#b30000', ground: '#2b0f00', fissure: '#ffff00', particle: 'rgba(50,50,50,0.6)', volcano: '#3d0000' },
  { skyTop: '#2b3a1a', skyBottom: '#576d3a', ground: '#2f2f2f', fissure: '#00ff00', particle: 'rgba(200,255,200,0.3)', volcano: '#1a2012' },
  { skyTop: '#0f0f2b', skyBottom: '#3c1a4b', ground: '#0b0c10', fissure: '#00f2ff', particle: 'rgba(220,220,255,0.4)', volcano: '#07071a' }
];

let parsedPalettes = [];
let volcanoes = [];
const VOLCANO_LAYERS = 3;

// Inicializa fondo y partículas
function initBackground() {
  particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      speed: 0.5 + Math.random() * 1.5,
      drift: -0.3 + Math.random() * 0.6,
      size: 1 + Math.random() * 2.5
    });
  }

  volcanoes = [];
  for (let layer = 0; layer < VOLCANO_LAYERS; layer++) {
    const layerVolcanoes = [];
    const count = 5 - layer;
    const parallaxFactor = 0.1 + (layer / VOLCANO_LAYERS) * 0.4;
    const baseHeight = 40 + layer * 30;
    const width = 200 + layer * 80;

    for (let i = 0; i < count; i++) {
      layerVolcanoes.push({
        // Spread them out across a wider-than-screen area to avoid pop-in
        x: i * (WIDTH / (count - 1)) + Math.random() * 200 - 100,
        w: width + Math.random() * 70,
        h: baseHeight + Math.random() * 50,
        parallax: parallaxFactor,
      });
    }
    volcanoes.push(layerVolcanoes);
  }
}

// ### 🎨 COLOR HELPERS ###
function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function parseColor(colorStr) {
  if (colorStr.startsWith("rgba")) {
    const parts = colorStr.match(/[\d.]+/g);
    return {
      r: parseFloat(parts[0]),
      g: parseFloat(parts[1]),
      b: parseFloat(parts[2]),
      a: parseFloat(parts[3]),
    };
  }
  if (colorStr.startsWith("#")) {
    let hex = colorStr.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    const val = parseInt(hex, 16);
    return {
      r: (val >> 16) & 255,
      g: (val >> 8) & 255,
      b: val & 255,
      a: 1,
    };
  }
  // Fallback for unhandled
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Formats an {r, g, b, a} object back into an "rgba(r,g,b,a)" string */
function rgbaToString(colorObj) {
  return `rgba(${Math.round(colorObj.r)}, ${Math.round(
    colorObj.g
  )}, ${Math.round(colorObj.b)}, ${colorObj.a})`;
}

/** Lerps between two {r, g, b, a} color objects */
function lerpColorObjects(colorA, colorB, t) {
  return {
    r: lerp(colorA.r, colorB.r, t),
    g: lerp(colorA.g, colorB.g, t),
    b: lerp(colorA.b, colorB.b, t),
    a: lerp(colorA.a, colorB.a, t),
  };
  if (colorStr.startsWith('rgba')) {
    const p = colorStr.match(/[\d.]+/g);
    return { r: +p[0], g: +p[1], b: +p[2], a: +p[3] };
  }
  let hex = colorStr.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const val = parseInt(hex, 16);
  return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255, a: 1 };
}

function rgbaToString(c) {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a})`;
}

function lerpColorObjects(a, b, t) {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t) };
}

function initPalettes() {
  parsedPalettes = palettes.map((p) => ({
    skyTop: parseColor(p.skyTop),
    skyBottom: parseColor(p.skyBottom),
    ground: parseColor(p.ground),
    fissure: parseColor(p.fissure),
    particle: parseColor(p.particle),
    volcano: parseColor(p.volcano),
  }));
}

function updateBackground() {
  if (!running) return;

  // Update particles (ash)
  particles.forEach((p) => {
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
  volcanoes.forEach((layer) => {
    layer.forEach((v) => {
      // Move based on gameSpeed and its parallax factor
      v.x -= gameSpeed * v.parallax;

      // Wrap volcanoes when they scroll off-screen
      if (v.x + v.w < -150) {
        v.x = WIDTH + 150 + Math.random() * 100; // Reset to the right
      }
  particles.forEach(p => {
    p.y += p.speed;
    p.x += p.drift;
    if (p.y > HEIGHT + 10) { p.y = -10; p.x = Math.random() * WIDTH; }
    if (p.x < -10) p.x = WIDTH + 10;
    if (p.x > WIDTH + 10) p.x = -10;
  });
  volcanoes.forEach(layer => {
    layer.forEach(v => {
      v.x -= gameSpeed * v.parallax;
      if (v.x + v.w < -150) v.x = WIDTH + 150 + Math.random() * 100;
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
  const type = Math.random() < 0.25 ? "spike" : "block";
  const width = type === "block" ? 40 + Math.floor(Math.random() * 40) : 36;
  const height = type === "block" ? 30 + Math.floor(Math.random() * 80) : 36;
  const y = type === "block" ? groundY - height : groundY - height;

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
  if (!running) return;

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
  // Background
  ctx.fillStyle = '#071021';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Parallax-ish horizon
  ctx.fillStyle = '#0b2a3a';
  ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);

  // Grid / lines for style
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 60) - (performance.now() / 20 % 60), groundY + 10);
    ctx.lineTo((i * 60) - (performance.now() / 20 % 60), HEIGHT);
    ctx.stroke();
  }

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
}

canvas.addEventListener('click', () => { if (!running) restart(); });

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
