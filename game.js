console.log("hello skibidies");

import {canvas, draw, drawArea} from "./drawer.js";
import TAS from "./astarTas.js"

const area = {
    x: 0,
    y: 110,
    width: canvas.width,
    height: 720,
    leftSafeX: canvas.width / 12,
    rightSafeX: canvas.width - canvas.width / 12,
    nodeSize: 16
};
class Player {
    constructor() {
        this.radius = 20;
        this.x = (area.leftSafeX - area.x) / 2;
        this.y = (area.height / 2) + area.y;
    }
}

class Enemy {
    constructor(r, x, y, vx, vy) {
        this.radius = r;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
    }
}

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

const player = new Player();
const enemies = [];
const gameState = {area, player, enemies};
window.gameState = gameState;

// ticks per second, tick interval
const TPS = 30;
const T_INT = 1000 / TPS;
let lastUpdate = performance.now();
let paused = false;
let showGrid = false;

drawArea(gameState.area, showGrid);
spawnEnemies(150, 15, 110);
const tasbot = TAS(gameState);
if (!paused) requestAnimationFrame(gameLoop);

function gameLoop(timestamp) {
    if (!paused) requestAnimationFrame(gameLoop);
    const elapsed = timestamp - lastUpdate;
    if (elapsed < T_INT) return;

    lastUpdate = timestamp - (elapsed % T_INT);
    update(elapsed / 1000);
}

// 1 update is 1 tick, dt is in seconds
// must model actual game flow: detect, calculate, move entities
// server handles moving entities: (send player movement packet, then server moves entities)
function update(dt) {
    let next = tasbot.testPath();
    tasMovePlayer(next);
    //movePlayer(dt);
    moveEnemies(dt);
    draw(gameState);
}

function tasMovePlayer(next) {
    if (next === null) return;
    player.x = next.x;
    player.y = next.y;
}

function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;
    if (dx == 0 && dy == 0) return;

    player.x += dx * 500 * dt;
    player.y += dy * 500 * dt;
    player.x = Math.min(Math.max(area.x + player.radius, player.x), area.x + area.width - player.radius);
    player.y = Math.min(Math.max(area.y + player.radius, player.y), area.y + area.height - player.radius);
}

function moveEnemies(dt) {
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        
        if (e.x - e.radius < area.leftSafeX) {
            e.x = area.leftSafeX + e.radius;
            e.vx = -e.vx;
        } else if (e.x + e.radius > area.rightSafeX) {
            e.x = area.rightSafeX - e.radius;
            e.vx = -e.vx;
        }

        if (e.y - e.radius < area.y) {
            e.y = area.y + e.radius;
            e.vy = -e.vy;
        } else if (e.y + e.radius > area.y + area.height) {
            e.y = area.y + area.height - e.radius;
            e.vy = -e.vy;
        }

        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const radii = e.radius + player.radius;
        if (dx*dx + dy*dy <= radii*radii) {
            downPlayer();
        }
    }
}

function downPlayer() {
    paused = true;
    pauseBtn.textContent = "Resume";
}

function spawnEnemies(num, radius=15, vel=200) {
    let minX = area.leftSafeX + radius, maxX = area.rightSafeX - radius;
    let minY = area.y + radius, maxY = area.y + area.height - radius;

    for (let i = 0; i < num; i++) {
        let x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        let y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        let angle = Math.random() * 2 * Math.PI;
        let vx = Math.cos(angle) * vel;
        let vy = Math.sin(angle) * vel;
        enemies.push(new Enemy(radius, x, y, vx, vy));
    }
}

// input listeners
window.addEventListener("keydown", e => {
    if (e.key in keys) {
        keys[e.key] = true;
        e.preventDefault();
    }
});

window.addEventListener("keyup", e => {
    if (e.key in keys) {
        keys[e.key] = false;
        e.preventDefault();
    }
});

// control button listeners
const gridBtn = document.getElementById("gridBtn");
gridBtn.addEventListener("click", () => {
    showGrid = !showGrid;
    drawArea(gameState.area, showGrid);
});

const pauseBtn = document.getElementById("pauseBtn");
pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";
    if (!paused) {
        lastUpdate = performance.now();
        requestAnimationFrame(gameLoop);
    }
});

const frameBtn = document.getElementById("frameBtn");
/*
frameBtn.addEventListener("click", () => {
    if (!paused) return;
    update(1 / TPS);
});
*/
let initialTimer = null;
let repeatTimer = null;

function advanceFrame() {
    if (!paused) return;
    update(1 / TPS);
}

frameBtn.addEventListener("mousedown", e => {
    e.preventDefault();
    if (initialTimer !== null || repeatTimer !== null) return;

    advanceFrame();
    initialTimer = setTimeout(() => {
        advanceFrame();
        repeatTimer = setInterval(advanceFrame, 1000 / (TPS / 2));
    }, 250);
});

frameBtn.addEventListener("mouseup", () => {
    clearTimeout(initialTimer);
    clearInterval(repeatTimer);
    initialTimer = null;
    repeatTimer = null;
});

