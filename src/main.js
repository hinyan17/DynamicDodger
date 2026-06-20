console.log("hello skibidies");

import * as Config from "./config.js";
import Game from "./game/game.js";
import Drawer from "./drawer.js";
import InputManager from "./input.js";
import UIManager from "./uiManager.js";
import VelocityObs from "./tas/velocityObs.js";

import { World } from "./game/worldModel.js";
import { Vector } from "./utils.js";

// Engine coordinates all other modules. it "owns" the game and wires everything together
// separation of concerns: game doesn't need to know about it, doesn't need to access them
async function Engine() {
    const settings = {...Config.settings};
    const game = new Game();
    await game.init();
    const drawer = new Drawer();

    // public API, defines all controllable actions
    const controller = {
        resize: () => drawer.resize(),
        skipArea: () => game.jumpAreas(1),
        skipTenAreas: () => game.jumpAreas(10),
        backTenAreas: () => game.jumpAreas(-10),
        revive: () => game.reviveActivePlayer(),
        resetAP: () => game.resetActivePlayer(),
        // todo these are "admin-only" actions, maybe when multiplayer?
        resetArea: () => game.resetCurrentArea(),
        togglePause,
        startSlow,
        stopSlow
    };

    // initialize dependent managers
    const inputter = new InputManager(drawer.canvas, settings.inputDelay);
    const ui = new UIManager(settings, controller);
    //const velObs = VelocityObs(game.gameState, settings, drawer);

    const timeVars = {
        lastTime: performance.now(),
        accumulator: 0,
        initialTimer: null,
        repeatTimer: null
    };

    start();
    // todo fix start, and fix repeatable calls
    function start() {
        if (!settings.paused) {
            requestAnimationFrame(gameLoop);
        }
    }

    function gameLoop(now) {
        if (!settings.paused) requestAnimationFrame(gameLoop);
        let elapsed = now - timeVars.lastTime;
        if (elapsed > 1000) elapsed = settings.MSPT;

        timeVars.lastTime = now;
        timeVars.accumulator += elapsed;

        while (timeVars.accumulator >= settings.MSPT) {
            updateGame();
            timeVars.accumulator -= settings.MSPT;
        }
        postUpdateGame();
    }

    function updateGame() {
        // clear debug drawing state (tied to update rate)
        drawer.clearDebugQueue();

        // capture current input state
        const raw = inputter.getInput();
        let intentVec = inputter.processInput(raw);
        // correct it with tas, if tas is on
        if (settings.tasOn) {
            intentVec = velObs.findSafeVelocity(intentVec);
        }
        game.activePlayer.updateIntent(intentVec);

        // run the actual game.update
        game.update(settings.SPT);
    }

    // do whatever else needs to be done in this frame (after all updates run)
    function postUpdateGame() {
        game.updateCameras();
        drawer.draw(game, settings.drawing);
    }

    // controllable actions
    function togglePause() {
        settings.paused = !settings.paused;
        if (!settings.paused) {
            timeVars.lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    function advanceFrame() {
        if (!settings.paused) return;
        updateGame();
        postUpdateGame();
    }

    function startSlow(e) {
        e.preventDefault();
        if (timeVars.initialTimer !== null) return;

        advanceFrame();
        timeVars.initialTimer = setTimeout(() => {
            advanceFrame();
            timeVars.repeatTimer = setInterval(advanceFrame, settings.slowdown * settings.MSPT);
        }, 250);
    }

    function stopSlow(e) {
        e.preventDefault();
        if (timeVars.initialTimer === null) return;
        clearTimeout(timeVars.initialTimer);
        clearInterval(timeVars.repeatTimer);
        timeVars.initialTimer = null;
        timeVars.repeatTimer = null;
    }
}

// fix map creation and area loading first
await Engine();
//const w = await World.create(new Vector(0, 0), "../example-map.yaml");
//w.areas[0].load();
//console.log("world object: ", w);
