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
let hitFlash = 0;

// Jugador
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
const spawnInterval = 90;

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

function createObstacle() {
  const type = Math.random() < 0.25 ? 'spike' : 'block';
  const width = type === 'block' ? 40 + Math.floor(Math.random() * 40) : 36;
  const height = type === 'block' ? 30 + Math.floor(Math.random() * 80) : 36;
  const y = groundY - height;

  obstacles.push({
    x: WIDTH + 60,
    y,
    w: width,
    h: height,
    type
  });
}

// Colisión simple
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ❤️ Dibujar corazón
function drawHeart(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
  ctx.bezierCurveTo(
    x - size / 2, y + (size + topCurveHeight) / 2,
    x, y + (size + topCurveHeight) / 1.2,
    x, y + size
  );
  ctx.bezierCurveTo(
    x, y + (size + topCurveHeight) / 1.2,
    x + size / 2, y + (size + topCurveHeight) / 2,
    x + size / 2, y + topCurveHeight
  );
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();
}

function update() {
  if (!running) return;

  // Física del jugador
  player.vy += player.gravity;
  player.y += player.vy;
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

  // Movimiento y colisión de obstáculos
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= gameSpeed;

    // Eliminar si sale de la pantalla
    if (ob.x + ob.w < -50) {
      obstacles.splice(i, 1);
      continue;
    }

    // Checar colisión
    const playerBox = { x: player.x, y: player.y, w: player.size, h: player.size };
    const obBox = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
    if (rectsOverlap(playerBox, obBox)) {
      // Elimina solo este obstáculo
      obstacles.splice(i, 1);
      loseLife();
      break;
    }
  }

  score += 0.1 * (gameSpeed / 5);
  if (Math.floor(score) % 50 === 0 && Math.floor(score) !== 0) {
    gameSpeed = 5 + Math.floor(score / 100);
  }

  if (hitFlash > 0) hitFlash--;
}

function draw() {
  ctx.fillStyle = '#071021';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Suelo
  ctx.fillStyle = '#0b2a3a';
  ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);

  // Cuadrícula
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 60) - (performance.now() / 20 % 60), groundY + 10);
    ctx.lineTo((i * 60) - (performance.now() / 20 % 60), HEIGHT);
    ctx.stroke();
  }

  // Jugador
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Obstáculos
  obstacles.forEach(ob => {
    if (ob.type === 'block') {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(ob.x, ob.y, ob.w, 6);
    } else if (ob.type === 'spike') {
      ctx.fillStyle = '#ffd166';
      const spikeCount = Math.max(2, Math.floor(ob.w / 12));
      const step = ob.w / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
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

  // HUD: Score y vidas
  ctx.fillStyle = 'white';
  ctx.font = '18px Arial';
  ctx.fillText('Score: ' + Math.floor(score), 12, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('High: ' + Math.floor(highScore), 12, 50);

  const heartSize = 16;
  for (let i = 0; i < lives; i++) {
    drawHeart(20 + i * (heartSize + 8), 70, heartSize, '#ff3366');
  }

  // Flash rojo
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${hitFlash / 10})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Game over overlay
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

function loseLife() {
  lives--;
  hitFlash = 10;

  if (lives <= 0) {
    running = false;
    if (score > highScore) highScore = Math.floor(score);
  }
}

function restart() {
  running = true;
  score = 0;
  obstacles = [];
  spawnTimer = 0;
  player.y = groundY - player.size;
  player.vy = 0;
  player.onGround = true;
  gameSpeed = 5;
  lives = 3;
  hitFlash = 0;
}

canvas.addEventListener('click', () => { if (!running) restart(); });

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
