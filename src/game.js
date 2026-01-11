console.log("hello skibidies");

import * as Config from "./config.js";
import { Player, Pellet, EnemyRegistry } from "./entities.js";
import { Vector } from "./utils.js";

export default class Game {
    constructor() {
        this.area = this.createArea(Config.areaData);
        this.player = this.createPlayer(Config.playerData);
        this.enemies = this.createEnemies(Config.enemyData);
        this.pellets = this.createPellets(Config.areaData.pelletCount);
        this.camera = new Vector(0, 0);

        this.gameState = {
            camera: this.camera,
            area: this.area,
            player: this.player,
            enemies: this.enemies,
            pellets: this.pellets
        };
        //window.gameState = this.gameState;
    }

    // discrete collision detection. not mathematically perfect, but continuous is overkill
    update(dt, intentVec) {
        // reset temp effects first
        this.player.resetEffects();

        // move enemies
        for (const e of this.enemies) {
            e.move(dt);
            e.checkAreaCollision(this.area);
        }
        // apply aura effects
        for (const e of this.enemies) {
            if (e.aura) {
                e.applyAura(this.player);
            }
        }

        // move player
        this.player.move(dt, intentVec);
        this.player.checkAreaCollision(this.area);
        this.player.checkEnemyCollision(this.enemies, () => this.downPlayer());

        // eat pellets
        for (const p of this.pellets) {
            p.checkPlayerCollision(this.area, this.player);
        }
        // make all pellets pulse
        if (this.pellets.length > 0) {
            Pellet.oscillator.update(dt);
        }
    }

    downPlayer() {
        //settings.paused = true;
        //document.getElementById("pauseBtn").textContent = ">>";
    }

    resetArea() {
        this.player.reset();
        for (const e of this.enemies) {
            e.reset(this.area);
        }
        for (const p of this.pellets) {
            p.reset(this.area);
        }
    }

    updateCamera() {
        // later: linear interp to show frames between physics updates for high fps
        this.camera.x = this.player.pos.x - Config.CONSTS.GAME_WIDTH / 2;
        this.camera.y = this.player.pos.y - Config.CONSTS.GAME_HEIGHT / 2;
    }

    // game initialization functions
    createArea(areaData) {
        const {bg_tint, x, y, cols, rows, nodeSize, safeTileWidth} = areaData;
        const width = cols * nodeSize;
        const height = rows * nodeSize;
        const safeZoneWidth = safeTileWidth * nodeSize;
        return {
            bg_tint,
            x, y, width, height, cols, rows, nodeSize,
            leftSafeX: x + safeZoneWidth,
            rightSafeX: x + width - safeZoneWidth,
            leftTPX: x + 2 * nodeSize,
            rightTPX: x + width - (2 * nodeSize)
        };
    }

    createPlayer(playerData) {
        return new Player(playerData);
    }

    createEnemies(enemyData) {
        const enemies = [];
        for (const data of enemyData) {
            for (let i = 0 ; i < data.count; i++) {
                enemies.push(this.makeEnemy(data, i));
            }
        }
        return enemies;
    }

    makeEnemy(data, index) {
        // data.type is already evaluated as the internal string representation
        const EnemyClass = EnemyRegistry[data.type];
        if (!EnemyClass) {
            throw new Error("unknown enemy type, check for typos");
        }

        const context = {index, area: this.area};
        return EnemyClass.create(data, context);
    }

    createPellets(count) {
        const pellets = [];
        for (let i = 0; i < count; i++) {
            pellets.push(new Pellet(this.area));
        }
        return pellets;
    }
}
