const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 20; 
const tileCountX = canvas.width / gridSize;  
const tileCountY = canvas.height / gridSize; 

let snake = [];
let food = { x: 0, y: 0 };
let dx = 0, dy = 0;
let score = 0;
let currentLevel = 1;
let targetScore = 100;
let currentGrid = [];
let gameInterval = null;
let isGameStarted = false; 
let isPaused = false; 
let currentTheme = THEMES.SPRING; // Mặc định Mùa Xuân
const GAME_SPEED = 550;

// HỆ THỐNG ÂM NHẠC & PLAYLIST
const musicTracks = [
    "musics/track1.mp3",
    "musics/track2.mp3",
    "musics/track3.mp3"
];

let playlist = [];
let currentTrackIndex = 0;
const bgMusic = new Audio();
let isMuted = false;
let isMusicStarted = false;

// Tráo đổi ngẫu nhiên danh sách nhạc 3 bài (Fisher-Yates Shuffle)
function shufflePlaylist() {
    playlist = [...musicTracks];
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    currentTrackIndex = 0;
}

// Bắt đầu phát nhạc ngẫu nhiên khi người dùng bấm Bắt đầu chơi
function startMusic() {
    if (!isMusicStarted) {
        shufflePlaylist();
        isMusicStarted = true;
        playCurrentTrack();
    } else if (bgMusic.paused && !isMuted) {
        bgMusic.play().catch(() => {});
    }
}

// Phát bài hát theo chỉ số hiện tại
function playCurrentTrack() {
    if (playlist.length === 0) return;
    bgMusic.src = playlist[currentTrackIndex];
    bgMusic.muted = isMuted;
    bgMusic.play().catch(() => {});
}

// Khi hết bài -> tự động chuyển bài tiếp theo (hết 3 bài thì tráo lượt mới)
bgMusic.addEventListener("ended", () => {
    currentTrackIndex++;
    if (currentTrackIndex >= playlist.length) {
        shufflePlaylist();
    }
    playCurrentTrack();
});

// Bật / Tắt tiếng
function toggleMute() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    updateMuteUI();
}

// Cập nhật giao diện nút Mute
function updateMuteUI() {
    document.querySelectorAll(".music-toggle-btn").forEach(btn => {
        btn.innerText = isMuted ? "🔇" : "🔊";
        if (isMuted) btn.classList.add("muted");
        else btn.classList.remove("muted");
    });
    document.querySelectorAll(".music-menu-btn").forEach(btn => {
        btn.innerText = isMuted ? "🔇 MỞ TIẾNG" : "🔊 TẮT TIẾNG";
    });
}

// HÀM ĐỔI MÀU GIAO DIỆN VÀ GAME THEO CHỦ ĐỀ MÙA
function applyRandomTheme() {
    const themeKeys = Object.keys(THEMES);
    const randomKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    currentTheme = THEMES[randomKey];

    // 1. Đổi màu viền & nền Canvas
    canvas.style.borderColor = currentTheme.border;
    canvas.style.backgroundColor = currentTheme.bg;

    // 2. Đổi màu chữ, nút Menu, D-pad & Nút âm nhạc
    document.querySelectorAll(".score-label, .score-value, .menu-icon-btn, .btn, .music-toggle-btn").forEach(el => {
        el.style.color = currentTheme.border;
        el.style.borderColor = currentTheme.border;
    });

    // 3. Hiển thị Tên Mùa trên bảng điểm
    let seasonTag = document.getElementById("seasonTag");
    if (!seasonTag) {
        seasonTag = document.createElement("span");
        seasonTag.id = "seasonTag";
        seasonTag.className = "season-tag";
        const scoreBox = document.querySelector(".score-box");
        scoreBox.insertBefore(seasonTag, scoreBox.firstChild);
    }
    seasonTag.innerText = currentTheme.name;
    seasonTag.style.color = currentTheme.snakeHead;
}

function enterGameFullscreen() {
    startMusic(); // Phát nhạc ngẫu nhiên khi bấm Bắt đầu chơi
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
    }

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
    renderLevelGrid();
}

function exitGameFullscreen() {
    if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
    }
    
    if (gameInterval) clearInterval(gameInterval);
    isPaused = false;
    isGameStarted = false;

    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("resultModal").classList.add("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
}

function renderLevelGrid() {
    const gridContainer = document.getElementById("levelGrid");
    gridContainer.innerHTML = "";

    Object.keys(MAPS).forEach(lvl => {
        const btn = document.createElement("button");
        btn.className = "level-btn";
        btn.innerHTML = `Màn ${lvl}<span>${MAPS[lvl].targetScore}đ</span>`;
        btn.onclick = () => startGame(Number(lvl));
        gridContainer.appendChild(btn);
    });
}

function startGame(level) {
    startMusic();
    currentLevel = level;
    targetScore = MAPS[level].targetScore;
    currentGrid = MAPS[level].grid;

    document.getElementById("mainMenu").classList.add("hidden");
    document.getElementById("levelSelectModal").classList.add("hidden");
    document.getElementById("resultModal").classList.add("hidden");
    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");

    // Đổi màu chủ đề mùa ngẫu nhiên mỗi khi vào màn mới
    applyRandomTheme();
    resetGame();
}

function startRandomGame() {
    const levelKeys = Object.keys(MAPS);
    const randomLevel = levelKeys[Math.floor(Math.random() * levelKeys.length)];
    startGame(Number(randomLevel));
}

function resetGame() {
    score = 0;
    dx = 0; dy = 0;
    isGameStarted = false;
    isPaused = false;
    snake = [{ x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }];
    updateScoreUI();
    generateFood();

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, GAME_SPEED);
}

function gameLoop() {
    if (isGameStarted && !isPaused) {
        moveSnake();
        if (checkCollision()) return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawFood();
    drawSnake();
}

// Vẽ Vật cản theo màu Wall của Mùa
function drawMap() {
    ctx.fillStyle = currentTheme.wall;
    for (let r = 0; r < currentGrid.length; r++) {
        for (let c = 0; c < tileCountX; c++) {
            if (currentGrid[r][c] === 1) {
                ctx.fillRect(c * gridSize, r * gridSize, gridSize - 1, gridSize - 1);
            }
        }
    }
}

// Load Snake Images
const headImg = new Image();
headImg.src = "images/head.png";

const bodyImg = new Image();
bodyImg.src = "images/body.png";

const tailImg = new Image();
tailImg.src = "images/tail.png";

function drawRotatedImage(img, x, y, width, height, angle) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angle);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
}

function getGridDirection(p1, p2) {
    let dirX = p1.x - p2.x;
    let dirY = p1.y - p2.y;

    if (dirX > 1) dirX = -1;
    else if (dirX < -1) dirX = 1;

    if (dirY > 1) dirY = -1;
    else if (dirY < -1) dirY = 1;

    return { dirX, dirY };
}

// Vẽ Rắn sử dụng Hình ảnh Đầu, Thân, Đuôi
function drawSnake() {
    snake.forEach((part, index) => {
        const x = part.x * gridSize;
        const y = part.y * gridSize;

        if (index === 0) {
            // ĐẦU RẮN
            if (headImg.complete && headImg.naturalWidth !== 0) {
                let dirX = dx;
                let dirY = dy;
                if (dirX === 0 && dirY === 0) {
                    if (snake.length > 1) {
                        const dir = getGridDirection(snake[0], snake[1]);
                        dirX = dir.dirX;
                        dirY = dir.dirY;
                    } else {
                        dirX = 1; dirY = 0;
                    }
                }
                const angle = Math.atan2(dirY, dirX);
                drawRotatedImage(headImg, x, y, gridSize, gridSize, angle);
            } else {
                ctx.fillStyle = currentTheme.snakeHead;
                ctx.fillRect(x, y, gridSize - 1, gridSize - 1);
            }
        } else if (index === snake.length - 1 && snake.length > 1) {
            // ĐUÔI RẮN
            if (tailImg.complete && tailImg.naturalWidth !== 0) {
                const prev = snake[index - 1];
                const dir = getGridDirection(prev, part);
                const angle = Math.atan2(dir.dirY, dir.dirX);
                drawRotatedImage(tailImg, x, y, gridSize, gridSize, angle);
            } else {
                ctx.fillStyle = currentTheme.snakeBody;
                ctx.fillRect(x, y, gridSize - 1, gridSize - 1);
            }
        } else {
            // THÂN RẮN
            if (bodyImg.complete && bodyImg.naturalWidth !== 0) {
                ctx.drawImage(bodyImg, x, y, gridSize, gridSize);
            } else {
                ctx.fillStyle = currentTheme.snakeBody;
                ctx.fillRect(x, y, gridSize - 1, gridSize - 1);
            }
        }
    });
}

// Vẽ Mồi theo màu Food của Mùa
function drawFood() {
    ctx.fillStyle = currentTheme.food;
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1);
}

function moveSnake() {
    let headX = snake[0].x + dx;
    let headY = snake[0].y + dy;

    if (headX < 0) headX = tileCountX - 1;
    else if (headX >= tileCountX) headX = 0;

    if (headY < 0) headY = Math.floor(canvas.height / gridSize) - 1;
    else if (headY >= Math.floor(canvas.height / gridSize)) headY = 0;

    const head = { x: headX, y: headY };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScoreUI();
        
        if (score >= targetScore) {
            clearInterval(gameInterval);
            showResultModal(true);
            return;
        }
        generateFood();
    } else {
        snake.pop();
    }
}

function generateFood() {
    let valid = false;
    const maxRow = currentGrid.length;
    while (!valid) {
        food.x = Math.floor(Math.random() * tileCountX);
        food.y = Math.floor(Math.random() * maxRow);

        const isOnWall = currentGrid[food.y] && currentGrid[food.y][food.x] === 1;
        const isOnSnake = snake.some(p => p.x === food.x && p.y === food.y);
        if (!isOnWall && !isOnSnake) valid = true;
    }
}

function checkCollision() {
    const head = snake[0];
    const hitWall = currentGrid[head.y] && currentGrid[head.y][head.x] === 1;
    const hitSelf = snake.slice(1).some(p => p.x === head.x && p.y === head.y);

    if (hitWall || hitSelf) {
        clearInterval(gameInterval);
        showResultModal(false);
        return true;
    }
    return false;
}

function changeDirection(dir) {
    if (isPaused) return;

    if (!isGameStarted) {
        isGameStarted = true;
    }

    if (dir === 'UP' && dy === 0) { dx = 0; dy = -1; }
    if (dir === 'DOWN' && dy === 0) { dx = 0; dy = 1; }
    if (dir === 'LEFT' && dx === 0) { dx = -1; dy = 0; }
    if (dir === 'RIGHT' && dx === 0) { dx = 1; dy = 0; }
}

function openPauseMenu() {
    isPaused = true;
    document.getElementById("pauseModal").classList.remove("hidden");
}

function resumeGame() {
    isPaused = false;
    document.getElementById("pauseModal").classList.add("hidden");
}

function exitToMenu() {
    if (gameInterval) clearInterval(gameInterval);
    isPaused = false;
    isGameStarted = false;

    document.getElementById("pauseModal").classList.add("hidden");
    document.getElementById("resultModal").classList.add("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("mainMenu").classList.remove("hidden");
}

function showResultModal(isWin) {
    const modal = document.getElementById("resultModal");
    const title = document.getElementById("resultTitle");
    const msg = document.getElementById("resultMessage");
    const nextBtn = document.getElementById("nextLevelBtn");

    modal.classList.remove("hidden");

    if (isWin) {
        title.innerText = "🎉 CHIẾN THẮNG!";
        title.style.color = currentTheme.snakeHead;
        msg.innerText = `Chúc mừng! Bạn đã hoàn thành Màn ${currentLevel}.`;

        if (MAPS[currentLevel + 1]) {
            nextBtn.classList.remove("hidden");
        } else {
            nextBtn.classList.add("hidden");
        }
    } else {
        title.innerText = "💥 GAME OVER!";
        title.style.color = "#FF5252";
        msg.innerText = `Điểm của bạn: ${score}/${targetScore}`;
        nextBtn.classList.add("hidden");
    }
}

function nextLevel() {
    if (MAPS[currentLevel + 1]) {
        startGame(currentLevel + 1);
    }
}

function restartCurrentLevel() {
    document.getElementById("pauseModal").classList.add("hidden");
    startGame(currentLevel);
}

function updateScoreUI() {
    document.getElementById("scoreInfo").innerText = `${score}/${targetScore}`;
}

function showLevelSelect() {
    document.getElementById("levelSelectModal").classList.remove("hidden");
}

function hideLevelSelect() {
    document.getElementById("levelSelectModal").classList.add("hidden");
}

function showIosGuide() {
    document.getElementById("iosGuideModal").classList.remove("hidden");
}

function hideIosGuide() {
    document.getElementById("iosGuideModal").classList.add("hidden");
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
    return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

let isForceLandscape = false;

function toggleForceLandscape() {
    isForceLandscape = !isForceLandscape;
    if (isForceLandscape) {
        document.body.classList.add("force-landscape");
    } else {
        document.body.classList.remove("force-landscape");
    }
    updateForceLandscapeBtnUI();
}

function updateForceLandscapeBtnUI() {
    const btns = document.querySelectorAll(".force-rotate-btn");
    btns.forEach(btn => {
        btn.innerText = isForceLandscape ? "🔄 Tắt ép xoay ngang" : "🔄 Ép xoay màn hình ngang (Cho iPhone)";
    });
}

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") changeDirection('UP');
    if (e.key === "ArrowDown") changeDirection('DOWN');
    if (e.key === "ArrowLeft") changeDirection('LEFT');
    if (e.key === "ArrowRight") changeDirection('RIGHT');
});

document.addEventListener("DOMContentLoaded", () => {
    if (isIOS() && !isStandalone()) {
        const iosBtn = document.getElementById("iosInstallBtn");
        if (iosBtn) iosBtn.classList.remove("hidden");
    }

    const buttons = document.querySelectorAll(".dpad-controls .btn");
    
    buttons.forEach(btn => {
        btn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            
            if (btn.classList.contains("btn-up")) changeDirection('UP');
            if (btn.classList.contains("btn-down")) changeDirection('DOWN');
            if (btn.classList.contains("btn-left")) changeDirection('LEFT');
            if (btn.classList.contains("btn-right")) changeDirection('RIGHT');

            btn.classList.add("active-touch");
        }, { passive: false });

        btn.addEventListener("touchend", () => {
            btn.classList.remove("active-touch");
        });
    });
});