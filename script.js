/*
  Geometry Dash - estilo minimal
  Mueve un cuadrado que corre y salta sobre obstáculos.
  Controles: click / touch / Space para saltar, R para reiniciar.
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Tamaño base y ajuste por devicePixelRatio
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
let gameSpeed = 5;
let score = 0;
let highScore = 0;
let running = true;
let lives = 3;
let lastLives = 3;
let hitFlash = 0;
let lifeFlash = 0;

// Jugador
const player = {
  x: 120,
  size: 42,
  y: groundY - 42,
  prevY: groundY - 42,
  vy: 0,
  gravity: 0.75,
  jumpPower: -15,
  doubleJumpPower: -13,
  maxJump: 2,
  jumpsUsed: 0,
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
        x: (i * (WIDTH / (count - 1))) + Math.random() * 200 - 100,
        w: width + Math.random() * 70,
        h: baseHeight + Math.random() * 50,
        parallax: parallaxFactor
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
  parsedPalettes = palettes.map(p => ({
    skyTop: parseColor(p.skyTop),
    skyBottom: parseColor(p.skyBottom),
    ground: parseColor(p.ground),
    fissure: parseColor(p.fissure),
    particle: parseColor(p.particle),
    volcano: parseColor(p.volcano)
  }));
}

function updateBackground() {
  if (!running) return;
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
  if (!running) return;
  if (player.onGround) {
    player.vy = player.jumpPower;
    player.onGround = false;
    player.jumpsUsed = 1;
    return;
  }
  if (player.jumpsUsed < player.maxJump) {
    player.vy = player.doubleJumpPower;
    player.jumpsUsed++;
  }
}

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
  if (e.key === 'r' || e.key === 'R') restart();
});
canvas.addEventListener('mousedown', jump);
canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });

function createObstacle() {
  const type = Math.random() < 0.25 ? 'spike' : 'block';
  const width = type === 'block' ? 40 + Math.random() * 40 : 36;
  const height = type === 'block' ? 30 + Math.random() * 80 : 36;
  const y = groundY - height;
  obstacles.push({ x: WIDTH + 60, y, w: width, h: height, type });
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ❤️ Dibuja corazones
function drawHeart(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const top = size * 0.3;
  ctx.moveTo(x, y + top);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + top);
  ctx.bezierCurveTo(x - size / 2, y + (size + top) / 2, x, y + (size + top) / 1.2, x, y + size);
  ctx.bezierCurveTo(x, y + (size + top) / 1.2, x + size / 2, y + (size + top) / 2, x + size / 2, y + top);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + top);
  ctx.closePath();
  ctx.fill();
}

// 🧱 Actualización del juego
function update() {
  updateBackground();
  if (!running) return;

  const now = performance.now();
  if (isTransitioning) {
    const elapsed = now - transitionStartTime;
    transitionProgress = Math.min(elapsed / TRANSITION_DURATION_MS, 1);
    if (transitionProgress >= 1) {
      isTransitioning = false;
      currentAestheticIndex = nextAestheticIndex;
      transitionProgress = 0;
    }
  }

  const milestone = Math.floor(score / 100);
  if (milestone > lastScoreMilestone && !isTransitioning) {
    isTransitioning = true;
    transitionStartTime = now;
    lastScoreMilestone = milestone;
    nextAestheticIndex = (currentAestheticIndex + 1) % palettes.length;
  }

  player.prevY = player.y;
  player.vy += player.gravity;
  player.y += player.vy;
  if (player.y + player.size >= groundY) {
    player.y = groundY - player.size;
    player.vy = 0;
    player.onGround = true;
    player.jumpsUsed = 0;
  }

  spawnTimer++;
  if (spawnTimer > spawnInterval) {
    spawnTimer = 0;
    createObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= gameSpeed;
    if (ob.x + ob.w < -50) {
      obstacles.splice(i, 1);
      continue;
    }

    const playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
    if (rectsOverlap(playerBox, ob)) {
      const prevBottom = player.prevY + player.size;
      const currBottom = player.y + player.size;
      const obTop = ob.y;

      const landed = (prevBottom <= obTop && currBottom >= obTop && player.vy >= 0);
      if (ob.type === 'block' && landed) {
        player.y = obTop - player.size;
        player.vy = 0;
        player.onGround = true;
      } else {
        loseLife(i); // 🔥 solo elimina el obstáculo que causa daño
      }
    }
  }

  score += 0.1 * (gameSpeed / 5);
  if (Math.floor(score) % 50 === 0 && Math.floor(score) !== 0) {
    gameSpeed = 5 + Math.floor(score / 100);
  }

  if (hitFlash > 0) hitFlash--;
  if (lifeFlash > 0) lifeFlash--;
}

// 💔 Pierde una vida (solo elimina ese obstáculo)
function loseLife(index) {
  lives--;
  hitFlash = 10;
  lifeFlash = 15;
  obstacles.splice(index, 1); // solo ese obstáculo

  if (lives <= 0) {
    running = false;
    if (score > highScore) highScore = Math.floor(score);
  }
}

// 🔄 Reiniciar
function restart() {
  running = true;
  score = 0;
  lives = 3;
  lastLives = 3;
  obstacles = [];
  spawnTimer = 0;
  player.y = groundY - player.size;
  player.vy = 0;
  player.onGround = true;
  player.jumpsUsed = 0;
  gameSpeed = 5;
  initBackground();
  currentAestheticIndex = 0;
  nextAestheticIndex = 0;
  isTransitioning = false;
  transitionProgress = 0;
  lastScoreMilestone = 0;
}

canvas.addEventListener('click', () => { if (!running) restart(); });

// 🎨 Dibujar todo
function draw() {
  const pa = parsedPalettes[currentAestheticIndex];
  const pb = parsedPalettes[nextAestheticIndex];
  const t = transitionProgress;
  const skyTop = lerpColorObjects(pa.skyTop, pb.skyTop, t);
  const skyBottom = lerpColorObjects(pa.skyBottom, pb.skyBottom, t);
  const ground = lerpColorObjects(pa.ground, pb.ground, t);
  const particle = lerpColorObjects(pa.particle, pb.particle, t);
  const volcano = lerpColorObjects(pa.volcano, pb.volcano, t);

  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0, rgbaToString(skyTop));
  grad.addColorStop(1, rgbaToString(skyBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  volcanoes.forEach((layer, i) => {
    ctx.fillStyle = rgbaToString(volcano);
    ctx.globalAlpha = 0.2 + (i / VOLCANO_LAYERS) * 0.5;
    layer.forEach(v => {
      ctx.beginPath();
      ctx.moveTo(v.x, groundY);
      ctx.lineTo(v.x + v.w / 2, groundY - v.h);
      ctx.lineTo(v.x + v.w, groundY);
      ctx.closePath();
      ctx.fill();
    });
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = rgbaToString(particle);
  particles.forEach(p => ctx.fillRect(p.x, p.y, p.size, p.size));

  ctx.fillStyle = rgbaToString(ground);
  ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);

  // Jugador
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Obstáculos
  obstacles.forEach(ob => {
    ctx.fillStyle = ob.type === 'block' ? '#ff6b6b' : '#ffd166';
    if (ob.type === 'block') {
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(ob.x, ob.y, ob.w, 6);
    } else {
      const spikes = Math.max(2, Math.floor(ob.w / 12));
      const step = ob.w / spikes;
      for (let i = 0; i < spikes; i++) {
        const sx = ob.x + i * step;
        ctx.beginPath();
        ctx.moveTo(sx, ob.y + ob.h);
        ctx.lineTo(sx + step / 2, ob.y);
        ctx.lineTo(sx + step, ob.y + ob.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  });

  // HUD
  ctx.fillStyle = 'white';
  ctx.font = '18px Arial';
  ctx.fillText('Score: ' + Math.floor(score), 12, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('High: ' + Math.floor(highScore), 12, 50);

  const heartSize = 16;
  for (let i = 0; i < 3; i++) {
    let color = '#ff3366';
    if (i >= lives) color = 'rgba(255,255,255,0.2)';
    if (lifeFlash > 0 && i === lives) color = '#ff0000';
    drawHeart(20 + i * (heartSize + 8), 70, heartSize, color);
  }

  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${hitFlash / 10})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

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

// 🌀 Loop principal
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initBackground();
initPalettes();
loop();
