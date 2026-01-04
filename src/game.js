console.log("hello skibidies");

import * as Config from "./config.js";
import UIManager from "./uiManager.js";
import InputManager from "./inputManager.js";
import Drawer from "./drawer.js";
import * as Entities from "./entities.js";
import { EntityType } from "./entities.js";
import { Vector, getRandomCoords, getRandomAngle } from "./utils.js";
import VelocityObs from "./tas/velocityObs.js";

// initialize game data
const settings = Config.settings;
const camera = new Vector(0, 0);
const area = createArea(Config.areaData);
const player = createPlayer(Config.playerData);
const enemies = createEnemies(Config.enemyData);
const gameState = {settings, camera, area, player, enemies};
window.gameState = gameState;

// initialize ui, input, drawer
const hookFunctions = {togglePause, startSlowAdvance, stopSlowAdvance};
const uinterface = new UIManager(gameState, hookFunctions);
const inputter = new InputManager(settings.inputDelay);
const drawer = new Drawer();

// initialize tas things
const velObs = VelocityObs(gameState, drawer);

// start the game loop
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

    postUpdate();
    drawer.draw(gameState);
}

// discrete collision detection, the standard for simple 2d physics.
// technically not mathematically perfect, but the continuous version is complete overkill
function update(dt) {
    // clear debug drawing state (tied to update rate)
    drawer.clearDebugQueue();

    // capture current input state
    const raw = inputter.getInput();
    const intentVec = inputter.processInput(raw);

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
        tasMovePlayer(dt, intentVec);
    } else {
        player.move(dt, intentVec, area);
    }

    // check for player hit
    if (player.checkDead(enemies)) {
        //downPlayer();
    }
}

// run once per frame, after update(s)
function postUpdate() {
    // update camera. later: linear interp to show frames between physics updates for high fps
    if (settings.followPlayer) {
        camera.x = player.pos.x - window.innerWidth / 2;
        camera.y = player.pos.y - window.innerHeight / 2;
    }
}

function tasMovePlayer(dt, intentVec) {
    const correctedIntent = velObs.findSafeVelocity(intentVec);
    player.move(dt, correctedIntent, area);
}

function downPlayer() {
    settings.paused = true;
    document.getElementById("pauseBtn").textContent = ">>";
}

// game initialization functions
function createArea({x, y, cols, rows, nodeSize, safeTileWidth}) {
    return {
        x, y, cols, rows, nodeSize,
        width: cols * nodeSize,
        height: rows * nodeSize,
        leftSafeX: x + nodeSize * safeTileWidth,
        rightSafeX: x + (cols * nodeSize) - (nodeSize * safeTileWidth)
    };
}

function createPlayer(playerData) {
    return new Entities.Player(playerData.spawn, playerData.radius, playerData.speed);
}

function createEnemies(enemyData) {
    const enemies = [];
    for (const data of enemyData) {
        for (let i = 0 ; i < data.count; i++) {
            enemies.push(makeEnemy(data, i));
        }
    }
    return enemies;
}

function makeEnemy(data, index) {
    const spawn = getRandomCoords(area, data.radius);
    const angle = getRandomAngle();

    switch (data.type) {
        case EntityType.NORMAL:
            return new Entities.Normal(spawn, data.radius, data.speed, angle);
        case EntityType.SLOWING:
            return new Entities.Slowing(spawn, data.radius, data.speed, angle, data.auraRadius);
        case EntityType.WALL:
            return new Entities.Wall(data.radius, data.speed, data.clockwise, index / data.count, area);
    }
}

// ui hook functions
function advanceFrame() {
    if (!settings.paused) return;
    update(settings.SPT);
    postUpdate();
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
        repeatTimer = setInterval(advanceFrame, settings.slowdown * settings.MSPT);
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
