// Variables del juego
let gameState = {
    lives: 5,
    score: 0,
    streak: 0,
    dragonSpeed: 0.8,
    baseSpeed: 0.8,
    gameRunning: false,
    currentQuestion: null,
    questionActive: false,
    dragonPosition: { x: -100, y: 0 }, // El dragón ahora tiene posición X e Y
    playerPosition: { x: 200, y: window.innerHeight / 2 - 25 },
    circles: [],
    particles: [],
    questionTimer: null,
    gameLoop: null,
    dragonAcceleration: 0.002, // Más sutil para el aumento de velocidad
    maxDragonSpeed: 5, // Velocidad máxima del dragón
    circleSpawnTimer: 0,
    circleSpawnInterval: 180, // frames (aprox. 3 segundos a 60fps)
    playerSpeed: 5, // Velocidad del jugador
    keys: {
        ArrowUp: false, w: false,
        ArrowDown: false, s: false,
        ArrowLeft: false, a: false,
        ArrowRight: false, d: false
    }
};

// Elementos del DOM
const elements = {
    startScreen: document.getElementById('startScreen'),
    gameContainer: document.getElementById('gameContainer'),
    questionContainer: document.getElementById('questionContainer'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    player: document.getElementById('player'),
    dragon: document.getElementById('dragon'),
    livesCount: document.getElementById('livesCount'),
    scoreCount: document.getElementById('scoreCount'),
    streakCount: document.getElementById('streakCount'),
    questionText: document.getElementById('questionText'),
    answersContainer: document.getElementById('answersContainer'),
    finalScore: document.getElementById('finalScore'),
    timerFill: document.getElementById('timerFill'),
    debugInfo: document.getElementById('debugInfo'),
    dragonX: document.getElementById('dragonX'),
    playerX: document.getElementById('playerX'),
    distance: document.getElementById('distance'),
    circleCount: document.getElementById('circleCount')
};

// Sonidos (usando Web Audio API)
let audioContext;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
    } catch (e) {
        console.log('Audio no disponible:', e);
    }
}

function playSound(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioContext) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Error al reproducir sonido:', e);
    }
}

// Generar preguntas matemáticas
function generateQuestion() {
    const operations = ['+', '-', '×', '÷'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, correctAnswer;

    const difficulty = Math.min(Math.floor(gameState.score / 50), 5);

    switch(operation) {
        case '+':
            num1 = Math.floor(Math.random() * (20 + difficulty * 10)) + 1;
            num2 = Math.floor(Math.random() * (20 + difficulty * 10)) + 1;
            correctAnswer = num1 + num2;
            break;
        case '-':
            num1 = Math.floor(Math.random() * (30 + difficulty * 10)) + 10;
            num2 = Math.floor(Math.random() * num1) + 1;
            correctAnswer = num1 - num2;
            break;
        case '×':
            num1 = Math.floor(Math.random() * (8 + difficulty)) + 1;
            num2 = Math.floor(Math.random() * (8 + difficulty)) + 1;
            correctAnswer = num1 * num2;
            break;
        case '÷':
            correctAnswer = Math.floor(Math.random() * (8 + difficulty)) + 1;
            num2 = Math.floor(Math.random() * (6 + difficulty)) + 1;
            num1 = correctAnswer * num2;
            break;
    }
// Asegurar que la respuesta correcta sea un número positivo
    const wrongAnswers = [];
    const maxWrong = Math.max(correctAnswer * 2 + 10, 100); 
    
    while(wrongAnswers.length < 3) {
        let wrong;
        if (Math.random() < 0.6) {
            wrong = correctAnswer + Math.floor(Math.random() * 10) - 5;
        } else {
            wrong = Math.floor(Math.random() * maxWrong) + 1;
        }
        
        if(wrong !== correctAnswer && wrong > 0 && !wrongAnswers.includes(wrong)) {
            wrongAnswers.push(wrong);
        }
    }

    const allAnswers = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

    return {
        question: `${num1} ${operation} ${num2} = ?`,
        answers: allAnswers,
        correct: correctAnswer
    };
}

// Mostrar pregunta
function showQuestion() {
    if (gameState.questionActive) return;

    gameState.questionActive = true;
    gameState.currentQuestion = generateQuestion();
    
    elements.questionText.textContent = gameState.currentQuestion.question;
    elements.answersContainer.innerHTML = '';

    // Pausar el dragón mientras se responde
    // gameState.dragonSpeed = 0; // The dragon continues to fly, but cannot catch player while question is active.

    gameState.currentQuestion.answers.forEach(answer => {
        const button = document.createElement('button');
        button.className = 'answer-btn';
        button.textContent = answer;
        button.onclick = () => checkAnswer(answer);
        elements.answersContainer.appendChild(button);
    });
    
    elements.questionContainer.classList.remove('hidden');
    
    let timeLeft = 100;
    elements.timerFill.style.width = '100%';
    
    gameState.questionTimer = setInterval(() => {
        timeLeft -= 1;
        elements.timerFill.style.width = timeLeft + '%';
        
        if (timeLeft <= 0) {
            clearInterval(gameState.questionTimer);
            if (gameState.questionActive) {
                checkAnswer(null); // Tiempo agotado
            }
        }
    }, 100);
}

// Verificar respuesta
function checkAnswer(selectedAnswer) {
    if (!gameState.questionActive) return;
    
    gameState.questionActive = false;
    
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    
    const buttons = elements.answersContainer.querySelectorAll('.answer-btn');
    let isCorrect = selectedAnswer === gameState.currentQuestion.correct;
    
    buttons.forEach(btn => {
        const btnValue = parseInt(btn.textContent);
        if (btnValue === selectedAnswer) {
            btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        } else if (btnValue === gameState.currentQuestion.correct) {
            btn.classList.add('correct');
        }
        btn.onclick = null;
    });
    
    setTimeout(() => {
        elements.questionContainer.classList.add('hidden');
        
        if (isCorrect) {
            gameState.score += 10 + (gameState.streak * 5);
            gameState.streak += 1;
            
            if (gameState.streak % 3 === 0 && gameState.lives < 5) {
                gameState.lives += 1;
                createParticles(elements.player, '#27ae60');
                playSound(659, 0.3, 'sine', 0.15);
            }
            
            playSound(523, 0.4, 'sine', 0.12);
            createParticles(elements.player, '#f39c12');
            
            // El dragón se aleja bastante al responder correctamente
            gameState.dragonPosition.x = Math.max(gameState.dragonPosition.x - 150, -elements.dragon.offsetWidth - 100);
            
        } else {
            gameState.lives -= 1;
            gameState.streak = 0;
            
            playSound(196, 0.6, 'square', 0.1);
            
            if (gameState.lives <= 0) {
                setTimeout(endGame, 500);
                return;
            }
        }
        
        // Aumentar la velocidad del dragón gradualmente
        gameState.dragonSpeed = Math.min(
            gameState.baseSpeed + (gameState.score * gameState.dragonAcceleration),
            gameState.maxDragonSpeed
        );
        
        updateHUD();
        
    }, 1000);
}

// Detectar colisión entre jugador y círculo
function checkCircleCollision() {
    const playerRect = elements.player.getBoundingClientRect();
    
    gameState.circles.forEach((circle, index) => {
        const circleRect = circle.getBoundingClientRect();
        
        // Simple AABB collision detection
        if (playerRect.left < circleRect.right &&
            playerRect.right > circleRect.left &&
            playerRect.top < circleRect.bottom &&
            playerRect.bottom > circleRect.top) {
            
            circle.remove();
            gameState.circles.splice(index, 1);
            showQuestion();
            playSound(440, 0.2, 'sine', 0.08);
            return; // Exit early to avoid modifying array while iterating if multiple collisions
        }
    });
}

// Crear círculo mágico
function createMagicCircle() {
    if (gameState.questionActive || gameState.circles.length >= 3) return;
    
    const circle = document.createElement('div');
    circle.className = 'magic-circle';
    circle.textContent = '?';
    
    const x = window.innerWidth - Math.random() * (window.innerWidth / 2) - 100;
    const y = Math.random() * (window.innerHeight - 150) + 75;
    
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    
    elements.gameContainer.appendChild(circle);
    gameState.circles.push(circle);
    
    let currentX = x;
    const moveSpeed = 1 + Math.random() * 0.5;
    
    const moveCircle = () => {
        if (!gameState.gameRunning) {
            if (circle.parentNode) {
                circle.remove();
            }
            return;
        }
        
        currentX -= moveSpeed;
        circle.style.left = currentX + 'px';
        
        if (currentX < -100) {
            if (circle.parentNode) {
                circle.remove();
            }
            const index = gameState.circles.indexOf(circle);
            if (index > -1) {
                gameState.circles.splice(index, 1);
            }
        } else {
            requestAnimationFrame(moveCircle);
        }
    };
    
    requestAnimationFrame(moveCircle);
}

// Crear partículas
function createParticles(element, color) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.backgroundColor = color;
        particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
        particle.style.top = (rect.top + Math.random() * rect.height) + 'px';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 3 + 1;
        particle.style.setProperty('--dx', Math.cos(angle) * velocity + 'px');
        particle.style.setProperty('--dy', Math.sin(angle) * velocity + 'px');
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 3000);
    }
}

// Actualizar HUD
function updateHUD() {
    elements.livesCount.textContent = gameState.lives;
    elements.scoreCount.textContent = gameState.score;
    elements.streakCount.textContent = gameState.streak;
}

// Actualizar debug info
function updateDebug() {
    if (elements.debugInfo.classList.contains('hidden')) return;
    
    elements.dragonX.textContent = Math.round(gameState.dragonPosition.x);
    elements.playerX.textContent = Math.round(gameState.playerPosition.x);
    elements.distance.textContent = Math.round(gameState.playerPosition.x - (gameState.dragonPosition.x + elements.dragon.offsetWidth));
    elements.circleCount.textContent = gameState.circles.length;
}

// --- Funciones de Control del Juego ---

function startGame() {
    initAudio();
    elements.startScreen.classList.add('hidden');
    elements.gameContainer.classList.remove('hidden');
    elements.gameOverScreen.classList.add('hidden');

    // Reiniciar estado del juego
    gameState.lives = 5;
    gameState.score = 0;
    gameState.streak = 0;
    gameState.dragonSpeed = gameState.baseSpeed;
    gameState.gameRunning = true;
    gameState.questionActive = false;
    gameState.dragonPosition = { x: -elements.dragon.offsetWidth - 200, y: Math.random() * (window.innerHeight - elements.dragon.offsetHeight) }; // Posición inicial aleatoria en Y
    gameState.playerPosition = { x: 200, y: window.innerHeight / 2 - elements.player.offsetHeight / 2 };
    
    gameState.circles.forEach(circle => circle.remove());
    gameState.circles = [];
    gameState.circleSpawnTimer = 0;
    
    elements.player.style.left = gameState.playerPosition.x + 'px';
    elements.player.style.top = gameState.playerPosition.y + 'px';
    elements.dragon.style.left = gameState.dragonPosition.x + 'px';
    elements.dragon.style.top = gameState.dragonPosition.y + 'px'; // Actualizar posición Y del dragón
    
    updateHUD();
    gameLoop();
}

function endGame() {
    gameState.gameRunning = false;
    if (gameState.gameLoop) {
        cancelAnimationFrame(gameState.gameLoop);
    }
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    
    elements.gameContainer.classList.add('hidden');
    elements.questionContainer.classList.add('hidden');
    elements.gameOverScreen.classList.remove('hidden');
    elements.finalScore.textContent = gameState.score;
    
    gameState.circles.forEach(circle => circle.remove());
    gameState.circles = [];
}

function restartGame() {
    startGame();
}

// --- Movimiento del Jugador ---
document.addEventListener('keydown', (e) => {
    // Permitir movimiento del jugador incluso si hay una pregunta activa.
    // La pregunta pausará el movimiento del dragón, no el del jugador.
    if (gameState.gameRunning) {
        gameState.keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (gameState.gameRunning) {
        gameState.keys[e.key] = false;
    }
});

function handlePlayerMovement() {
    const playerWidth = elements.player.offsetWidth;
    const playerHeight = elements.player.offsetHeight;
    
    if (gameState.keys.ArrowLeft || gameState.keys.a) {
        gameState.playerPosition.x = Math.max(gameState.playerPosition.x - gameState.playerSpeed, 0);
    }
    if (gameState.keys.ArrowRight || gameState.keys.d) {
        gameState.playerPosition.x = Math.min(gameState.playerPosition.x + gameState.playerSpeed, window.innerWidth - playerWidth);
    }
    if (gameState.keys.ArrowUp || gameState.keys.w) {
        gameState.playerPosition.y = Math.max(gameState.playerPosition.y - gameState.playerSpeed, 0);
    }
    if (gameState.keys.ArrowDown || gameState.keys.s) {
        gameState.playerPosition.y = Math.min(gameState.playerPosition.y + gameState.playerSpeed, window.innerHeight - playerHeight);
    }
    
    elements.player.style.left = gameState.playerPosition.x + 'px';
    elements.player.style.top = gameState.playerPosition.y + 'px';
}

// --- Bucle Principal del Juego ---
function gameLoop() {
    if (!gameState.gameRunning) {
        return;
    }

    handlePlayerMovement();

    // Movimiento del Dragón (persigue al jugador y tiene movimiento aleatorio en Y)
    // El dragón solo se moverá si no hay una pregunta activa
    if (!gameState.questionActive) {
        const dragonRect = elements.dragon.getBoundingClientRect();
        const playerRect = elements.player.getBoundingClientRect();

        // Mover horizontalmente hacia el jugador
        if (gameState.dragonPosition.x < gameState.playerPosition.x) {
            gameState.dragonPosition.x += gameState.dragonSpeed;
        } else if (gameState.dragonPosition.x > gameState.playerPosition.x) {
            gameState.dragonPosition.x -= gameState.dragonSpeed;
        }

        // Movimiento vertical aleatorio + tendencia a la posición Y del jugador
        const randomYDelta = (Math.random() - 0.5) * 2 * gameState.dragonSpeed; // Pequeño movimiento aleatorio
        let targetY = gameState.playerPosition.y;
        
        // Si el dragón está lejos, simplemente se mueve aleatoriamente en Y
        if (Math.abs(gameState.playerPosition.x - gameState.dragonPosition.x) > 300) {
            gameState.dragonPosition.y += randomYDelta;
        } else {
            // Si está cerca, se mueve más hacia la Y del jugador
            if (gameState.dragonPosition.y < targetY) {
                gameState.dragonPosition.y += gameState.dragonSpeed * 0.5 + randomYDelta;
            } else if (gameState.dragonPosition.y > targetY) {
                gameState.dragonPosition.y -= gameState.dragonSpeed * 0.5 + randomYDelta;
            }
        }
        
        // Limitar la posición Y del dragón dentro de la ventana
        gameState.dragonPosition.y = Math.max(0, Math.min(gameState.dragonPosition.y, window.innerHeight - dragonRect.height));

        elements.dragon.style.left = gameState.dragonPosition.x + 'px';
        elements.dragon.style.top = gameState.dragonPosition.y + 'px';

        // Comprobar colisión directa del dragón con el jugador (Game Over)
        // Esto solo ocurre si el dragón lo atrapa y NO hay una pregunta activa (porque el objetivo es chocar con círculos)
        if (!gameState.questionActive &&
            playerRect.left < dragonRect.right &&
            playerRect.right > dragonRect.left &&
            playerRect.top < dragonRect.bottom &&
            playerRect.bottom > dragonRect.top) {
            
            playSound(100, 0.8, 'sawtooth', 0.2); // Sonido de ser atrapado
            createParticles(elements.player, '#e74c3c'); // Partículas rojas de daño
            endGame(); // El juego termina si el dragón te atrapa
            return; // Detener el bucle
        }
    }


    // Generar círculos mágicos
    gameState.circleSpawnTimer++;
    if (gameState.circleSpawnTimer >= gameState.circleSpawnInterval) {
        createMagicCircle();
        gameState.circleSpawnTimer = 0;
        gameState.circleSpawnInterval = Math.max(90, 180 - Math.floor(gameState.score / 20));
    }

    // Comprobar colisiones con círculos
    checkCircleCollision();

    updateDebug();

    gameState.gameLoop = requestAnimationFrame(gameLoop);
}

// Configuración inicial para mostrar la pantalla de inicio
document.addEventListener('DOMContentLoaded', () => {
    elements.gameContainer.classList.add('hidden');
    elements.questionContainer.classList.add('hidden');
    elements.gameOverScreen.classList.add('hidden');
    elements.startScreen.classList.remove('hidden');

    // Establecer la posición inicial del jugador en relación con la altura de la pantalla
    gameState.playerPosition.y = window.innerHeight / 2 - elements.player.offsetHeight / 2;
    elements.player.style.top = gameState.playerPosition.y + 'px';

    // Establecer la posición inicial del dragón de manera que comience fuera de la pantalla
    gameState.dragonPosition.x = -elements.dragon.offsetWidth - 200;
    gameState.dragonPosition.y = Math.random() * (window.innerHeight - elements.dragon.offsetHeight); // Posición Y aleatoria al inicio
    elements.dragon.style.left = gameState.dragonPosition.x + 'px';
    elements.dragon.style.top = gameState.dragonPosition.y + 'px';
});
