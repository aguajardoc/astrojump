/*
  Geometry Dash - estilo minimal
  Mueve un cuadrado que corre y salta sobre obstáculos.
  Controles: click / touch / Space para saltar, R para reiniciar.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Tamaño base y ajuste por devicePixelRatio
const WIDTH = 800;
const HEIGHT = 450;

function resizeCanvas() {
  const DPR = window.devicePixelRatio || 1;
  canvas.style.width = WIDTH + "px";
  canvas.style.height = HEIGHT + "px";
  canvas.width = Math.floor(WIDTH * DPR);
  canvas.height = Math.floor(HEIGHT * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

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
  size: 80,
  y: groundY - 56,
  prevY: groundY - 56,
  vy: 0,
  gravity: 0.75,
  jumpPower: -15,
  doubleJumpPower: -13,
  maxJump: 2,
  jumpsUsed: 0,
  onGround: true,
  color: "#00d1ff",
  // Sprite/animación del astronauta
  sprite: new Image(),
  spriteLoaded: false,
  frames: 6, // número de frames horizontales (ajusta si tu sprite sheet tiene otro conteo)
  frameIndex: 0,
  frameTimer: 0,
  frameInterval: 6, // velocidad de animación (frames del juego por cambio)
  jumpFrame: 0, // índice de frame para salto (se ajusta al cargar la imagen)
  frameW: 0,
  frameH: 0,
};
player.sprite.onload = () => {
  player.spriteLoaded = true;
  // No usamos frames: mantenemos la imagen completa como el personaje estático
  player.frameW = player.sprite.naturalWidth;
  player.frameH = player.sprite.naturalHeight;
  console.log(
    "astronaut sprite loaded",
    player.sprite.naturalWidth,
    "x",
    player.sprite.naturalHeight
  );
};
player.sprite.onerror = (e) => {
  console.error("Failed to load astronaut sprite:", player.sprite.src, e);
};
// Ruta del sprite: imagen dentro de la carpeta "assets/personaje"
player.sprite.src = "assets/personaje/astronaut.png";

// Obstáculos
let obstacles = [];
let spawnTimer = 0;
// spawn interval randomized to support variable spacing (frames)
const minSpawnInterval = 45;
const maxSpawnInterval = 140;
let spawnInterval = Math.floor((minSpawnInterval + maxSpawnInterval) / 2); // initial value

function randomSpawnInterval() {
  return Math.floor(Math.random() * (maxSpawnInterval - minSpawnInterval + 1)) + minSpawnInterval;
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

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    jump();
  }
  if (e.key === "r" || e.key === "R") {
    restart();
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

canvas.addEventListener("mousedown", () => jump());
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    jump();
  },
  { passive: false }
);

// Genera un obstáculo (bloque o pinchos)
function createObstacle() {
  const type = Math.random() < 0.25 ? 'spike' : 'block';
  const width = type === 'block' ? 40 + Math.floor(Math.random() * 40) : 36;
  let height = type === 'block' ? 30 + Math.floor(Math.random() * 80) : 36;

  // If you want blocks to be taller for a double-jump branch, enable this flag.
  // Currently we only double blocks (not spikes) to keep spike behavior predictable.
  const doubleBlockHeight = true;
  if (type === 'block' && doubleBlockHeight) {
    // Double the block height but cap so obstacles never exceed the playable area.
    const maxAllowed = Math.max(20, groundY - 20);
    height = Math.min(height * 2, maxAllowed);
  }

  const y = groundY - height;

  obstacles.push({
    x: WIDTH + 60,
    y,
    w: width,
    h: height,
    type,
  });
function createObstacle() {
  const type = Math.random() < 0.25 ? 'spike' : 'block';
  const width = type === 'block' ? 40 + Math.random() * 40 : 36;
  const height = type === 'block' ? 30 + Math.random() * 80 : 36;
  const y = groundY - height;
  obstacles.push({ x: WIDTH + 60, y, w: width, h: height, type });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
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

  // 1. Check if we are currently transitioning
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
  } else {
    player.onGround = false;
  }

  // --- Animación del astronauta ---
  if (player.spriteLoaded) {
    if (!player.onGround) {
      // en el aire usar frame de salto
      player.frameIndex = player.jumpFrame;
      player.frameTimer = 0;
    } else {
      player.frameTimer++;
      if (player.frameTimer >= player.frameInterval) {
        player.frameTimer = 0;
        player.frameIndex =
          (player.frameIndex + 1) % Math.max(1, player.frames);
      }
    }
  }
  // Spawning
    player.jumpsUsed = 0;
  }

  spawnTimer++;
  if (spawnTimer > spawnInterval) {
    spawnTimer = 0;
    createObstacle();
    // pick the next random spawn interval
    spawnInterval = randomSpawnInterval();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= gameSpeed;
    // Offscreen
    if (ob.x + ob.w < -50) obstacles.splice(i, 1);
    // Check collision (approx spikes as box for simplicity)
    const playerBox = {
      x: player.x,
      y: player.y,
      w: player.size,
      h: player.size,
    };
    const obBox = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
    if (rectsOverlap(playerBox, obBox)) {
      if (ob.type === "spike") {
        // contact with spikes is always lethal
        gameOver();
      } else if (ob.type === "block") {
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

  // 5. Draw Distant Volcanoes (Parallax) - THIS WAS MISSING
  volcanoes.forEach((layer, index) => {
    // Set color and alpha based on layer
    ctx.fillStyle = distantVolcanoColor;
    ctx.globalAlpha = 0.2 + (index / VOLCANO_LAYERS) * 0.5; // Fainter layers are further

    layer.forEach((v) => {
      // Draw a simple triangle for the volcano silhouette
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

  // 6. Draw Ash/Particles - THIS WAS MISSING
  ctx.fillStyle = particleColor;
  particles.forEach((p) => {
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.fillStyle = rgbaToString(particle);
  particles.forEach(p => ctx.fillRect(p.x, p.y, p.size, p.size));

  ctx.fillStyle = rgbaToString(ground);
  ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);

  // ### END OF BACKGROUND ###

  // -- THE OLD CODE BELOW WAS REMOVED --
  // ctx.fillStyle = '#0b2a3a';
  // ctx.fillRect(0, groundY, WIDTH, HEIGHT - groundY);
  // ... (and the grid lines) ...
  // --

  // Draw player (astronaut sprite or fallback square)
  if (player.spriteLoaded) {
    // Dibujar la imagen completa escalada para que no se corte (personaje estático)
    ctx.drawImage(
      player.sprite,
      player.x, // dx
      player.y, // dy
      player.size, // dWidth
      player.size // dHeight
    );
  } else {
    // Fallback: cuadrado mientras carga la imagen
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);
  }
  // Draw obstacles
  obstacles.forEach((ob) => {
    if (ob.type === "block") {
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      // top highlight
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(ob.x, ob.y, ob.w, 6);
    } else if (ob.type === "spike") {
      // draw spikes as triangle shapes
      ctx.fillStyle = "#ffd166";
      const spikeW = ob.w;
      const spikeH = ob.h;
      const spikeCount = Math.max(2, Math.floor(spikeW / 12));
      const step = spikeW / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
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

  // UI: Score
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Score: " + Math.floor(score), 12, 28);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText("High: " + Math.floor(highScore), 12, 50);
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
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "white";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 10);
    ctx.font = "16px Arial";
    ctx.fillText("Press R or Click to restart", WIDTH / 2, HEIGHT / 2 + 18);
    ctx.textAlign = "start";
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

canvas.addEventListener("click", () => {
  if (!running) restart();
});

// 🌀 Loop principal
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initBackground();
initPalettes();
loop();
