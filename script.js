document.addEventListener('DOMContentLoaded', () => {
    const fadeEls = document.querySelectorAll('.fade-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
    });

    fadeEls.forEach((el) => observer.observe(el));
});

// ─── Space Invaders ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreSpan = document.getElementById('scoreDisplay');

const W = 700;  // larghezza canvas
const H = 450;  // altezza canvas

// ── Impostazioni ──
const PLAYER_W = 40;       // larghezza nave
const PLAYER_H = 24;       // altezza nave
const BULLET_W = 4;
const BULLET_H = 14;
const ENEMY_W = 30;
const ENEMY_H = 24;
const FIRE_INTERVAL = 100; // ms tra una raffica e l'altra

// ── Stato ──
let player = { x: W / 2 };
let bullets = [];
let enemies = [];
let score = 0;
let lastFire = 0;
let gameRunning = false;
let animFrame = 0;          // contatore per animazione nemici
let mouseInside = false;
let mouseX = W / 2;

// ── Crea ondata nemici (posizioni casuali nella griglia) ──
function spawnWave() {
    enemies = [];
    const rows = 4;
    const cols = 9;
    const gapX = 16;
    const gapY = 14;
    const totalW = cols * (ENEMY_W + gapX) - gapX;
    const startX = (W - totalW) / 2;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.65) {
                enemies.push({
                    x: startX + c * (ENEMY_W + gapX),
                    y: 40 + r * (ENEMY_H + gapY),
                    w: ENEMY_W,
                    h: ENEMY_H,
                    alive: true,
                });
            }
        }
    }
}

// ── Gestione mouse ──
canvas.addEventListener('mouseenter', () => { mouseInside = true; });
canvas.addEventListener('mouseleave', () => { mouseInside = false; });
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, mouseX));
});

// ── Disegna navicella ──
function drawPlayer() {
    const px = player.x;
    const py = H - 30;
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(px, py - PLAYER_H / 2);               // punta
    ctx.lineTo(px - PLAYER_W / 2, py + PLAYER_H / 2); // sinistra
    ctx.lineTo(px + PLAYER_W / 2, py + PLAYER_H / 2); // destra
    ctx.closePath();
    ctx.fill();
    // abitacolo
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(px, py - 2, 5, 0, Math.PI * 2);
    ctx.fill();
}

// ── Disegna nemico ──
function drawEnemy(e) {
    ctx.fillStyle = animFrame % 20 < 10 ? '#ff4757' : '#ff6b81';
    // corpo
    ctx.fillRect(e.x, e.y, e.w, e.h);
    // occhi
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x + 6, e.y + 5, 5, 5);
    ctx.fillRect(e.x + e.w - 11, e.y + 5, 5, 5);
}

// ── Sparo automatico triplo ──
function autoFire(now) {
    if (now - lastFire >= FIRE_INTERVAL) {
        const bx = player.x;
        const by = H - 30 - PLAYER_H / 2;
        bullets.push({ x: bx - 8 - BULLET_W / 2, y: by, w: BULLET_W, h: BULLET_H });
        bullets.push({ x: bx - BULLET_W / 2,     y: by, w: BULLET_W, h: BULLET_H });
        bullets.push({ x: bx + 8 - BULLET_W / 2, y: by, w: BULLET_W, h: BULLET_H });
        lastFire = now;
    }
}

// ── Update ──
function update(now) {
    // muovi nave verso il target
    const targetX = mouseInside ? mouseX : player.x;
    player.x += (targetX - player.x) * 0.15;

    // sparo
    autoFire(now);

    // muovi proiettili
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= 10;
        if (bullets[i].y + bullets[i].h < 0) {
            bullets.splice(i, 1);
        }
    }

    // velocità base che cresce col punteggio
    const speed = 0.35 + Math.min(score / 500, 1.2);

    // muovi nemici; quando uno tocca il fondo torna su
    for (const e of enemies) {
        if (!e.alive) continue;
        e.y += speed;
        if (e.y + e.h > H + 20) {
            e.y = -ENEMY_H - 10;
        }
    }

    // collisioni proiettili ⇢ nemici
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        let hit = false;
        for (const e of enemies) {
            if (!e.alive) continue;
            if (b.x < e.x + e.w && b.x + b.w > e.x &&
                b.y < e.y + e.h && b.y + b.h > e.y) {
                e.alive = false;
                hit = true;
                score++;
                scoreSpan.textContent = score;
                break;
            }
        }
        if (hit) bullets.splice(i, 1);
    }

    // rigenera ondata quando tutti morti
    if (enemies.every(e => !e.alive)) {
        spawnWave();
    }

    animFrame++;
}

// ── Render ──
function render() {
    ctx.clearRect(0, 0, W, H);

    // griglia sfondo
    ctx.strokeStyle = '#111118';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // nemici
    for (const e of enemies) {
        if (e.alive) drawEnemy(e);
    }

    // proiettili
    ctx.fillStyle = '#7c3aed';
    for (const b of bullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // nave
    drawPlayer();
}

// ── Game loop ──
function loop(timestamp) {
    if (!gameRunning) return;
    update(timestamp);
    render();
    requestAnimationFrame(loop);
}

// ── Avvio ──
function startGame() {
    score = 0;
    scoreSpan.textContent = '0';
    bullets = [];
    player.x = W / 2;
    lastFire = performance.now();
    spawnWave();
    gameRunning = true;
    requestAnimationFrame(loop);
}

// attesa per far caricare il foglio di stile / font
setTimeout(startGame, 100);
