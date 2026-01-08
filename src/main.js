import * as Config from "./config.js";
import Game from "./game.js";
import Drawer from "./drawer.js";
import InputManager from "./inputManager.js";
import UIManager from "./uiManager.js";
import VelocityObs from "./tas/velocityObs.js";

// Engine coordinates all other modules. it "owns" the game and wires everything together
// separation of concerns: game doesn't need to know about it, doesn't need to access them
function Engine() {
    const settings = {...Config.settings};
    const game = new Game();
    const drawer = new Drawer();

    // public API, defines all controllable actions
    const controller = {
        resize: () => drawer.resize(),
        reset: () => game.resetArea(),
        togglePause, startSlow, stopSlow
    };

    // initialize dependent managers
    const inputter = new InputManager(drawer.canvas, settings.inputDelay);
    const ui = new UIManager(game.gameState, settings, controller);
    const velObs = VelocityObs(game.gameState, settings, drawer);

    const timeVars = {
        lastTime: performance.now(),
        accumulator: 0,
        initialTimer: null,
        repeatTimer: null
    };

    start();
    // fix start, and fix repeatable calls later
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
        drawer.draw(game.gameState, settings.showGrid);
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

        // run the actual game.update
        game.update(settings.SPT, intentVec);
    }

    // do whatever else needs to be done in this frame (after all updates run)
    function postUpdateGame() {
        if (settings.followPlayer) {
            game.updateCamera();
        }
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
        drawer.draw(game.gameState, settings.showGrid);
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

Engine();
