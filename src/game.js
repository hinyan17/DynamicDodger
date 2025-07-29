console.log("hello skibidies");

import * as Drawer from "./drawer.js";
import TAS from "./astarTas.js";
import PathTracker from "./pathTracker.js";
import VelocityObs from "./velocityObs.js";

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
    y: 155,
    cols: 150,
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
    showGrid: false,
    tasOn: false,
    drawBlock: false,
    drawPath: true,
    drawVo: false
};
settings.SPT = 1 / settings.TPS;        // seconds per tick
settings.MSPT = 1000 / settings.TPS;    // milliseconds per tick


const player = new Player(20, 400);
const enemyInfo = {count: 200, size: 15, speed: 200};   // expand enemyInfo for different enemy type objects
const enemies = spawnEnemies(enemyInfo.count, enemyInfo.size, enemyInfo.speed);
const gameState = {area, player, enemies};
//window.gameState = gameState;

const tasbot = TAS(gameState, settings);
const tracker = PathTracker(gameState);
const voLayer = VelocityObs(gameState, settings);
let lastTime = performance.now();
let accumulator = 0;

Drawer.drawArea(area, settings.showGrid);
if (!settings.paused) requestAnimationFrame(gameLoop);

function gameLoop(now) {
    if (!settings.paused) requestAnimationFrame(gameLoop);
    let elapsed = now - lastTime;
    if (elapsed > 1000) elapsed = settings.MSPT;

    lastTime = now;
    accumulator += elapsed;

    while (accumulator >= settings.MSPT) {
        update(settings.SPT);
        accumulator -= settings.MSPT;
    }
    Drawer.draw(gameState);
}

// 1 update is 1 tick, dt is in seconds
// must model actual game flow: detect, calculate, move entities
// server handles moving entities: (send player movement packet, then server moves entities)
function update(dt) {
    if (settings.tasOn) {
        if (settings.drawBlock || settings.drawPath || settings.drawVo) {
            Drawer.drawArea(area, settings.showGrid);
        }
        tasMovePlayer(dt);
    } else {
        movePlayer(dt);
    }
    moveEnemies(dt);
}

function tasMovePlayer(dt) {
    /*
    // direct teleportation along the path
    const path = tasbot.testPath();
    if (path === null || path.length < 2) return;
    player.x = path[1].x;
    player.y = path[1].y;
    tasbot.updateStart();
    */
    ///*
    const path = tasbot.testPath();
    if (path === null) {console.log("reached goal"); return;}
    const heading = tracker.computeDesiredHeading(path, dt, tasbot.goalNode);
    //const heading = tracker.noPathHeading(tasbot.goalNode);
    const v = voLayer.findSafeVelocity(heading);
    //const v = {x: heading.ux * player.maxVel, y: heading.uy * player.maxVel};

    if (v === null) {
        //console.log("error");
        //settings.paused = true;
        //pauseBtn.textContent = ">>";
    } else {
        // this is the normal logic
        player.x += v.x * dt;
        player.y += v.y * dt;
        player.x = Math.min(Math.max(area.x + player.radius, player.x), area.x + area.width - player.radius);
        player.y = Math.min(Math.max(area.y + player.radius, player.y), area.y + area.height - player.radius);
        tasbot.updateStart();
    }
    //*/
}

function movePlayer(dt) {
    let ux = 0, uy = 0;
    if (player.keys.ArrowLeft || player.keys.KeyA) ux -= 1;
    if (player.keys.ArrowRight || player.keys.KeyD) ux += 1;
    if (player.keys.ArrowUp || player.keys.KeyW) uy -= 1;
    if (player.keys.ArrowDown || player.keys.KeyS) uy += 1;
    if (ux == 0 && uy == 0) return;

    player.x += ux * player.maxVel * dt;
    player.y += uy * player.maxVel * dt;
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
    } else if (e.code === "Space") {
        startSlowAdvance(e);
    }
});

window.addEventListener("keyup", e => {
    if (e.code in player.keys) {
        player.keys[e.code] = false;
        e.preventDefault();
    } else if (e.code === "Space") {
        stopSlowAdvance(e);
    }
});

// basic information display
const tpsSpan = document.getElementById("tpsSpan");
tpsSpan.textContent = settings.TPS;
const enemySpan = document.getElementById("enemySpan");
enemySpan.textContent = enemyInfo.count;
const nodeSpan = document.getElementById("nodeSpan");
nodeSpan.textContent = `${area.cols * area.rows} (${area.cols}x${area.rows})`;

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
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
});

const frameBtn = document.getElementById("frameBtn");
let initialTimer = null;
let repeatTimer = null;

function advanceFrame() {
    if (!settings.paused) return;
    update(settings.SPT);
    Drawer.draw(gameState);
}

function startSlowAdvance(e) {
    e.preventDefault();
    if (initialTimer !== null) return;

    advanceFrame();
    initialTimer = setTimeout(() => {
        advanceFrame();
        repeatTimer = setInterval(advanceFrame, 3 * settings.MSPT);
    }, 250);
}

function stopSlowAdvance(e) {
    e.preventDefault();
    if (initialTimer === null) return;
    clearTimeout(initialTimer);
    clearInterval(repeatTimer);
    initialTimer = null;
    repeatTimer = null;
}

frameBtn.addEventListener("mousedown", startSlowAdvance);
frameBtn.addEventListener("mouseup", stopSlowAdvance);
