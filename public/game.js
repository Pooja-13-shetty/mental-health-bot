// Game elements
const arena = document.getElementById('arena');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
let startButton = document.getElementById('start');

// Game state
let score = 0;
let timeLeft = 30;
let gameInterval;
let isPlaying = false;

// Initialize the game
function init() {
    clearInterval(gameInterval);
    arena.innerHTML = '';
    score = 0;
    timeLeft = 30;
    scoreElement.textContent = score;
    timeElement.textContent = timeLeft;
    isPlaying = false;
    startButton.textContent = 'Start';
    
    // Remove any existing game messages
    const existingMessage = document.querySelector('.game-message');
    if (existingMessage && existingMessage.parentNode) {
        existingMessage.parentNode.removeChild(existingMessage);
    }
}

// Create a bubble
function createBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    // Random size and position
    const size = Math.random() * 60 + 40; // 40-100px
    const x = Math.random() * (window.innerWidth - size - 40) + 20;
    
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${x}px`;
    bubble.style.bottom = '-100px';
    
    // Random color
    const hue = Math.random() * 360;
    bubble.style.backgroundColor = `hsla(${hue}, 80%, 70%, 0.8)`;
    
    // Add click event
    bubble.addEventListener('click', popBubble);
    
    // Make sure bubbles are clickable
    bubble.style.pointerEvents = 'auto';
    
    arena.appendChild(bubble);
    
    // Animate bubble
    const duration = Math.random() * 3000 + 3000; // 3-6 seconds
    bubble.style.transition = `bottom ${duration}ms linear`;
    
    // Force reflow
    void bubble.offsetWidth;
    
    bubble.style.bottom = `${window.innerHeight + 100}px`;
    
    // Remove bubble after animation
    setTimeout(() => {
        if (bubble.parentNode === arena) {
            arena.removeChild(bubble);
        }
    }, duration);
}

// Pop a bubble
function popBubble(e) {
    if (!isPlaying) return;
    
    const bubble = e.target;
    if (bubble.classList.contains('popped')) return;
    
    bubble.classList.add('popped');
    
    // Play pop sound
    const popSound = new Audio('/audio/pop.mp3');
    popSound.volume = 0.5;
    popSound.play().catch(e => console.log('Audio play failed:', e));
    
    // Update score
    score += 10;
    scoreElement.textContent = score;
    
    // Animate pop
    bubble.style.transform = 'scale(1.5)';
    bubble.style.opacity = '0';
    
    // Remove bubble after animation
    setTimeout(() => {
        if (bubble.parentNode === arena) {
            arena.removeChild(bubble);
        }
    }, 200);
    
    // Prevent event bubbling
    e.stopPropagation();
}

// Game loop
function gameLoop() {
    if (timeLeft <= 0) {
        endGame();
        return;
    }
    
    timeLeft -= 0.1;
    timeElement.textContent = Math.ceil(timeLeft);
    
    // Create new bubbles at random intervals
    if (Math.random() < 0.05) {
        createBubble();
    }
}

// Start the game
function startGame() {
    if (isPlaying) {
        // If already playing, stop the game
        clearInterval(gameInterval);
        init();
        return;
    }
    
    isPlaying = true;
    startButton.textContent = 'Stop';
    
    // Start game loop
    gameInterval = setInterval(gameLoop, 100);
    
    // Initial bubbles
    for (let i = 0; i < 5; i++) {
        setTimeout(createBubble, i * 500);
    }
}


// Set up event listeners
function setupEventListeners() {
    // Remove any existing event listeners by cloning the button
    const newButton = startButton.cloneNode(true);
    startButton.parentNode.replaceChild(newButton, startButton);
    startButton = document.getElementById('start');
    
    // Add click handler
    startButton.onclick = function() {
        if (isPlaying) {
            // If game is running, stop it
            clearInterval(gameInterval);
            init();
        } else {
            // If game is not running, start it
            startGame();
        }
    };
}

// End the game and show game over screen
function endGame() {
    isPlaying = false;
    clearInterval(gameInterval);
    
    // Create game over overlay
    let gameOverOverlay = document.createElement('div');
    gameOverOverlay.className = 'game-over-overlay';
    
    gameOverOverlay.innerHTML = `
        <div class="game-over-content">
            <h2>Time's Up!</h2>
            <p>Your score: ${score}</p>
            <button id="play-again">Play Again</button>
        </div>
    `;
    
    document.body.appendChild(gameOverOverlay);
    
    // Add click handler for play again button
    document.getElementById('play-again').addEventListener('click', function() {
        // Remove the overlay
        document.body.removeChild(gameOverOverlay);
        // Reset and start new game
        init();
        startGame();
    });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    init();
    setupEventListeners();
});

