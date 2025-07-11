console.log("hello skibidies");

import * as Drawer from "./drawer.js";
import TAS from "./astarTas.js";
import PurePursuit from "./purePursuit.js";
class Player {
    constructor(r, vel) {
        this.radius = r;
        this.maxVel = vel;
        this.x = (area.leftSafeX - area.x) / 2;
        this.y = (area.height / 2) + area.y;
        this.keys = {KeyW: false, KeyA: false, KeyS: false, KeyD: false,
            ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false};
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

const area = {
    x: 0,
    y: 130,
    cols: 144,
    rows: 50,
    nodeSize: 13
};
area.width = area.cols * area.nodeSize;
area.height = area.rows * area.nodeSize;
area.leftSafeX = area.x + area.nodeSize * 8;
area.rightSafeX = area.x + area.width - (area.nodeSize * 8);

const settings = {
    TPS: 30,
    paused: false,
    showGrid: true,
    tasOn: false
};
settings.T_INT = 1000 / settings.TPS;       // ticks per second, tick interval

const player = new Player(20, 300);
const enemyInfo = {count: 120, size: 15, speed: 110};   // expand enemyInfo have different enemy type objects
const enemies = spawnEnemies(enemyInfo.count, enemyInfo.size, enemyInfo.speed);
const gameState = {area, player, enemies};
//window.gameState = gameState;

const tasbot = TAS(gameState, settings);
const controller = PurePursuit(player, settings.T_INT);
let lastUpdate = performance.now();
Drawer.drawArea(area, settings.showGrid);

if (!settings.paused) requestAnimationFrame(gameLoop);

function gameLoop(timestamp) {
    if (!settings.paused) requestAnimationFrame(gameLoop);
    const elapsed = timestamp - lastUpdate;
    if (elapsed < settings.T_INT) return;

    lastUpdate = timestamp - (elapsed % settings.T_INT);
    update(elapsed / 1000);
}

// 1 update is 1 tick, dt is in seconds
// must model actual game flow: detect, calculate, move entities
// server handles moving entities: (send player movement packet, then server moves entities)
function update(dt) {
    if (settings.tasOn) {
        const path = tasbot.testPath();
        //tasMovePlayer(path[1]);
        //tasbot.updateStart();
        ///*
        const v = controller.computeDesiredVelocity(path, dt);
        player.x += v.vx * dt;
        player.y += v.vy * dt;
        tasbot.updateStart();
        //console.log(dt, player.x, player.y, v);
        //*/
    } else {
        movePlayer(dt);
    }
    moveEnemies(dt);
    Drawer.draw(gameState);
}

function tasMovePlayer(next) {
    if (next === null) return;
    player.x = next.x;
    player.y = next.y;
}

function movePlayer(dt) {
    let dx = 0, dy = 0;
    if (player.keys.ArrowLeft || player.keys.KeyA) dx -= 1;
    if (player.keys.ArrowRight || player.keys.KeyD) dx += 1;
    if (player.keys.ArrowUp || player.keys.KeyW) dy -= 1;
    if (player.keys.ArrowDown || player.keys.KeyS) dy += 1;
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
    settings.paused = true;
    pauseBtn.textContent = ">>";
}

function spawnEnemies(num, radius=15, vel=200) {
    const minX = area.leftSafeX + radius, maxX = area.rightSafeX - radius;
    const minY = area.y + radius, maxY = area.y + area.height - radius;

    const enemies = [];
    for (let i = 0; i < num; i++) {
        const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        const angle = Math.random() * 2 * Math.PI;
        const vx = Math.cos(angle) * vel;
        const vy = Math.sin(angle) * vel;
        enemies.push(new Enemy(radius, x, y, vx, vy));
    }
    return enemies;
}

// input listeners
window.addEventListener("keydown", e => {
    if (e.code in player.keys) {
        player.keys[e.code] = true;
        e.preventDefault();
    }
});

window.addEventListener("keyup", e => {
    if (e.code in player.keys) {
        player.keys[e.code] = false;
        e.preventDefault();
    }
});

// basic information display
const tpsSpan = document.getElementById("tpsSpan");
tpsSpan.textContent = settings.TPS;
const enemySpan = document.getElementById("enemySpan");
enemySpan.textContent = enemyInfo.count;
const nodeSpan = document.getElementById("nodeSpan");
nodeSpan.textContent = `${tasbot.cols * tasbot.rows} (${tasbot.cols}x${tasbot.rows})`;

const infoBar = document.getElementById("infoBar");
infoBar.style.opacity = "1";
infoBar.addEventListener("click", () => {
    infoBar.style.opacity = infoBar.style.opacity === "1" ? "0" : "1";
});

// control button listeners
const gridBtn = document.getElementById("gridBtn");
gridBtn.addEventListener("click", () => {
    settings.showGrid = !settings.showGrid;
    Drawer.drawArea(area, settings.showGrid);
});

const tasBtn = document.getElementById("tasBtn");
tasBtn.addEventListener("click", () => {
    settings.tasOn = !settings.tasOn;
});

const pauseBtn = document.getElementById("pauseBtn");
pauseBtn.addEventListener("click", () => {
    settings.paused = !settings.paused;
    pauseBtn.textContent = settings.paused ? ">>" : "||";
    if (!settings.paused) {
        lastUpdate = performance.now();
        requestAnimationFrame(gameLoop);
    }
});

const frameBtn = document.getElementById("frameBtn");
let initialTimer = null;
let repeatTimer = null;

function advanceFrame() {
    if (!settings.paused) return;
    update(1 / settings.TPS);
}

frameBtn.addEventListener("mousedown", e => {
    e.preventDefault();
    if (initialTimer !== null || repeatTimer !== null) return;

    advanceFrame();
    initialTimer = setTimeout(() => {
        advanceFrame();
        repeatTimer = setInterval(advanceFrame, 1000 / (settings.TPS / 3));
    }, 250);
});

frameBtn.addEventListener("mouseup", () => {
    clearTimeout(initialTimer);
    clearInterval(repeatTimer);
    initialTimer = null;
    repeatTimer = null;
});
