export default class UIManager {
    constructor(gameState, hookFunctions) {
        // be aware of object desync
        this.gameState = gameState;
        this.settings = gameState.settings;
        this.hookFunctions = hookFunctions;

        this.displayInfo();
        this.addButtonListeners();
        this.addInputListeners();
    }

    displayInfo() {
        const tpsSpan = document.getElementById("tpsSpan");
        const enemySpan = document.getElementById("enemySpan");
        const nodeSpan = document.getElementById("nodeSpan");
        const infoBar = document.getElementById("infoBar");

        tpsSpan.textContent = this.settings.TPS;
        enemySpan.textContent = this.gameState.enemies.length;
        nodeSpan.textContent =
            `${this.gameState.area.cols * this.gameState.area.rows}\
            (${this.gameState.area.cols}x${this.gameState.area.rows})`;

        infoBar.style.opacity = "1";
        infoBar.addEventListener("click", () => {
            infoBar.style.opacity = infoBar.style.opacity === "1" ? "0" : "1";
        });
    }

    addButtonListeners() {
        const {togglePause, startSlow, stopSlow} = this.hookFunctions;

        const gridBtn = document.getElementById("gridBtn");
        gridBtn.addEventListener("click", () => {
            this.settings.showGrid = !this.settings.showGrid;
        });

        const tasBtn = document.getElementById("tasBtn");
        tasBtn.addEventListener("click", () => {
            this.settings.tasOn = !this.settings.tasOn;
        });

        const pauseBtn = document.getElementById("pauseBtn");
        pauseBtn.addEventListener("click", () => {
            togglePause();
            pauseBtn.textContent = this.settings.paused ? ">>" : "||";
        });

        const frameBtn = document.getElementById("frameBtn");
        frameBtn.addEventListener("mousedown", startSlow);
        frameBtn.addEventListener("mouseup", stopSlow);
    }

    addInputListeners() {
        const {reset, resize, startSlow, stopSlow} = this.hookFunctions;

        window.addEventListener("keydown", e => {
            if (e.code === "Space") {
                startSlow(e);
            } else if (e.code === "KeyE") {
                reset();
            }
        });

        window.addEventListener("keyup", e => {
            if (e.code === "Space") {
                stopSlow(e);
            }
        });

        window.addEventListener("resize", resize);
    }
}
