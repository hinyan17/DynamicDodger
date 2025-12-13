console.log("hello skibidies");

import UIManager from "./uiManager.js";
import InputManager from "./inputManager.js";
import Drawer from "./drawer.js";
import * as Entities from "./entities.js";
import { EntityType } from "./entities.js";
import { Vector, getRandomCoords, getRandomAngle } from "./utils.js";

const settings = {
    TPS: 30,
    paused: false,
    showGrid: false,
    tasOn: false,
    drawBlock: false,
    drawPath: true,
    drawVo: false,
    followPlayer: true
};
settings.SPT = 1 / settings.TPS;        // seconds per tick
settings.MSPT = 1000 / settings.TPS;    // milliseconds per tick

// x, y, cols, rows, nodeSize, safeTileWidth
const area = createArea(0, 155, 150, 50, 13, 8);
const playerSpawn = new Vector((area.leftSafeX - area.x) / 2, (area.height / 2) + area.y);
const player = new Entities.Player(playerSpawn, 20, 510);
const enemyInfo = [
    {
        type: EntityType.NORMAL,
        count: 1,
        radius: 20,
        speed: 40
    },
    {
        type: EntityType.SLOWING,
        count: 10,
        radius: 20,
        speed: 120,
        auraRadius: 160
    },
    {
        type: EntityType.WALL,
        count: 10,
        radius: 30,
        speed: 120,
        clockwise: true
    },
    {
        type: EntityType.WALL,
        count: 1,
        radius: 30,
        speed: 120,
        clockwise: false
    }
];
const enemies = spawnEnemies(enemyInfo);
const gameState = {settings, area, player, enemies};

const camera = new Vector(0, 0);

// initialize ui, input, drawer
const hookFunctions = {togglePause, startSlowAdvance, stopSlowAdvance};
const uiManager = new UIManager(gameState, hookFunctions);
const inputManager = new InputManager();
const drawer = new Drawer();

let lastTime = performance.now();
let accumulator = 0;
drawer.drawArea(area, settings.showGrid);
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

    if (settings.followPlayer) {
        camera.x = player.pos.x - window.innerWidth / 2;
        camera.y = player.pos.y - window.innerHeight / 2;
    }
    drawer.draw(gameState, camera);
}

// 1 update is 1 tick, dt is in seconds
function update(dt) {
    // capture state of input to be used for this update
    const input = inputManager.getInput();

    // reset temp effects first
    player.resetEffects();

    // move enemies
    for (const e of enemies) {
        e.move(dt, area);
    }
    // apply aura effects
    for (const e of enemies) {
        if (e.aura) {
            e.auraEffect(player);
        }
    }

    // move player
    if (settings.tasOn) {
        tasMovePlayer(dt);
    } else {
        player.move(dt, input, area);
    }

    // check for player hit
    if (player.checkDead(enemies)) {
        //downPlayer();
    }
}

function tasMovePlayer(dt) {
    if (settings.drawBlock || settings.drawPath || settings.drawVo) {
        drawer.drawArea(area, settings.showGrid);
    }
    // tas things
}

function downPlayer() {
    settings.paused = true;
    document.getElementById("pauseBtn").textContent = ">>";
}

function createArea(x, y, cols, rows, nodeSize, safeTileWidth) {
    return {
        x, y, cols, rows, nodeSize,
        width: cols * nodeSize,
        height: rows * nodeSize,
        leftSafeX: x + nodeSize * safeTileWidth,
        rightSafeX: x + (cols * nodeSize) - (nodeSize * safeTileWidth)
    };
}

function spawnEnemies(enemyInfo) {
    const enemies = [];
    for (const config of enemyInfo) {
        for (let i = 0 ; i < config.count; i++) {
            enemies.push(createEnemy(config, i));
        }
    }
    return enemies;
}

function createEnemy(config, index) {
    const spawn = getRandomCoords(area, config.radius);
    const angle = getRandomAngle();

    switch (config.type) {
        case EntityType.NORMAL:
            return new Entities.Normal(spawn, config.radius, config.speed, angle);
        case EntityType.SLOWING:
            return new Entities.Slowing(spawn, config.radius, config.speed, angle, config.auraRadius);
        case EntityType.WALL:
            return new Entities.Wall(config.radius, config.speed, config.clockwise, index / config.count, area);
    }
}

// ui hook functions
function advanceFrame() {
    if (!settings.paused) return;
    update(settings.SPT);
    drawer.draw(gameState);
}

function togglePause() {
    settings.paused = !settings.paused;
    if (!settings.paused) {
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

let initialTimer = null;
let repeatTimer = null;

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
