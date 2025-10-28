const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME SETTINGS ---
const CHARACTER_IMAGE_SRC = 'character.png'; // <--- CHANGE THIS TO YOUR IMAGE PATH!
const CHARACTER_WIDTH = 50;
const CHARACTER_HEIGHT = 50;
const GROUND_Y = canvas.height - CHARACTER_HEIGHT;
const JUMP_STRENGTH = 15;
const GRAVITY = 0.6;
const OBSTACLE_WIDTH = 20;
const OBSTACLE_HEIGHT = 40;
const OBSTACLE_SPEED = 5; // How fast obstacles move
const GAME_SPEED_INCREMENT = 0.001; // How much speed increases per frame

// --- GAME STATE ---
let characterX = 50;
let characterY = GROUND_Y;
let velocityY = 0;
let isJumping = false;
let obstacles = [];
let score = 0;
let gameSpeed = OBSTACLE_SPEED; // Initial game speed
let gameOver = false;

// Load character image
const characterImage = new Image();
characterImage.src = CHARACTER_IMAGE_SRC;
characterImage.onload = () => {
    console.log("Character image loaded.");
    startGame();
};
characterImage.onerror = () => {
    console.error("Failed to load character image. Make sure 'character.png' exists or update CHARACTER_IMAGE_SRC.");
    // Draw a placeholder if image fails to load
    drawCharacter = () => {
        ctx.fillStyle = 'red';
        ctx.fillRect(characterX, characterY, CHARACTER_WIDTH, CHARACTER_HEIGHT);
    };
    startGame();
};

// --- GAME FUNCTIONS ---

function drawCharacter() {
    // If characterImage didn't load, a placeholder function is used instead
    if (characterImage.complete && characterImage.naturalWidth !== 0) {
        ctx.drawImage(characterImage, characterX, characterY, CHARACTER_WIDTH, CHARACTER_HEIGHT);
    } else {
        // Fallback drawing if image isn't ready or failed to load
        ctx.fillStyle = 'blue';
        ctx.fillRect(characterX, characterY, CHARACTER_WIDTH, CHARACTER_HEIGHT);
    }
}

function drawObstacle(obstacle) {
    ctx.fillStyle = 'green';
    ctx.fillRect(obstacle.x, obstacle.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
}

function updateCharacter() {
    if (isJumping) {
        characterY += velocityY;
        velocityY += GRAVITY;

        if (characterY >= GROUND_Y) {
            characterY = GROUND_Y;
            isJumping = false;
            velocityY = 0;
        }
    }
}

function updateObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        let obstacle = obstacles[i];
        obstacle.x -= gameSpeed; // Use current game speed

        // Remove off-screen obstacles
        if (obstacle.x + OBSTACLE_WIDTH < 0) {
            obstacles.splice(i, 1);
            i--; // Adjust index after removing
            score++;
        }
    }

    // Add new obstacles periodically
    if (Math.random() < 0.015 && obstacles.length < 3) { // Adjust frequency
        obstacles.push({
            x: canvas.width,
            y: GROUND_Y - OBSTACLE_HEIGHT,
            width: OBSTACLE_WIDTH,
            height: OBSTACLE_HEIGHT
        });
    }
}

function checkCollision() {
    for (let obstacle of obstacles) {
        if (
            characterX < obstacle.x + obstacle.width &&
            characterX + CHARACTER_WIDTH > obstacle.x &&
            characterY < obstacle.y + obstacle.height &&
            characterY + CHARACTER_HEIGHT > obstacle.y
        ) {
            gameOver = true;
            break;
        }
    }
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 25);
}

function gameLoop() {
    if (gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear screen
        ctx.fillStyle = 'black';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '25px Arial';
        ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 60);
        return; // Stop the loop
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game elements
    updateCharacter();
    updateObstacles();
    checkCollision();

    // Draw game elements
    drawCharacter();
    for (let obstacle of obstacles) {
        drawObstacle(obstacle);
    }
    drawScore();

    // Gradually increase game speed
    gameSpeed += GAME_SPEED_INCREMENT;

    requestAnimationFrame(gameLoop);
}

function jump() {
    if (!isJumping && !gameOver) {
        isJumping = true;
        velocityY = -JUMP_STRENGTH;
    }
}

function restartGame() {
    characterY = GROUND_Y;
    velocityY = 0;
    isJumping = false;
    obstacles = [];
    score = 0;
    gameSpeed = OBSTACLE_SPEED;
    gameOver = false;
    startGame();
}

// --- EVENT LISTENERS ---
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        jump();
    }
    if (event.code === 'KeyR' && gameOver) {
        restartGame();
    }
});

function startGame() {
    gameLoop();
}

// The game starts after the character image is loaded (or fails to load).
// This ensures we don't try to draw an image that isn't ready.