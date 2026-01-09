export default class UIManager {
    constructor(gameState, settings, controller) {
        // be aware of object desync
        this.gameState = gameState;
        this.settings = settings;
        this.controller = controller;

        this.displayInfo();
        this.addButtonListeners();
        this.addInputListeners();
    }

    displayInfo() {
        const infoBar = document.getElementById("infoBar");
        infoBar.textContent = `\
            TPS: ${this.settings.TPS}
            Delay: ${this.settings.inputDelay}
            Enemies: ${this.gameState.enemies.length}
            Area: ${this.gameState.area.cols * this.gameState.area.rows}\
                (${this.gameState.area.cols}x${this.gameState.area.rows})
            more:
        `;

        infoBar.style.opacity = "1";
        infoBar.addEventListener("click", () => {
            infoBar.style.opacity = infoBar.style.opacity === "1" ? "0" : "1";
        });
    }

    addButtonListeners() {
        const {togglePause, startSlow, stopSlow} = this.controller;

        const gridBtn = document.getElementById("gridBtn");
        gridBtn.addEventListener("click", () => {
            this.settings.drawing.showGrid = !this.settings.drawing.showGrid;
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
        const {reset, resize, startSlow, stopSlow} = this.controller;

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
