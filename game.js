console.log("hello skibidies");

import {draw, drawArea, canvas} from "./drawer.js";
//import Heap from "./heap-js.es5.js";

let area = {
    x: 0,
    y: 110,
    width: canvas.width,
    height: 720,
    leftSafeX: canvas.width / 12,
    rightSafeX: canvas.width - canvas.width / 12
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

function spawnEnemies(num) {
    let radius = 10;
    let vel = 200;
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

// input stuff
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

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

function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;

    player.x += dx * 500 * dt;
    player.y += dy * 500 * dt;
    player.x = Math.min(Math.max(area.x + player.radius, player.x), area.x + area.width - player.radius);
    player.y = Math.min(Math.max(area.y + player.radius, player.y), area.y + area.height - player.radius);
}

function downPlayer() {
    paused = true;
    pauseBtn.textContent = "Resume";
}

function update(dt) {
    // dt is in seconds
    movePlayer(dt);

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
            //downPlayer();
        }
    }
}

const player = new Player();
const enemies = [];
const gameState = {area, player, enemies};
window.gameState = gameState;

drawArea(gameState.area);
spawnEnemies(5);

// ticks per second, tick interval
const TPS = 60;
const T_INT = 1000 / TPS;

let paused = false;
let lastUpdate = performance.now();
function gameLoop(timestamp) {
    if (!paused) requestAnimationFrame(gameLoop);

    const elapsed = timestamp - lastUpdate;
    if (elapsed < T_INT) return;

    lastUpdate = timestamp - (elapsed % T_INT);
    update(elapsed / 1000);
    draw(gameState);
}
requestAnimationFrame(gameLoop);

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
frameBtn.addEventListener("click", () => {
    if (!paused) return;
    update(1 / TPS);
    draw(gameState);
});
