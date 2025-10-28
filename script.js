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
  if (!running) return;

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
      // More accurate spike collision could be added, but this is fine for now
      gameOver();
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
