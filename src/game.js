console.log("hello skibidies");

import * as Config from "./config.js";
import { Player, EnemyRegistry } from "./entities.js";
import { Vector } from "./utils.js";

export default class Game {
    constructor() {
        this.area = this.createArea(Config.areaData);
        this.player = this.createPlayer(Config.playerData);
        this.enemies = this.createEnemies(Config.enemyData);
        this.camera = new Vector(0, 0);
        this.gameState = {
            camera: this.camera,
            area: this.area,
            player: this.player,
            enemies: this.enemies
        };
        //window.gameState = this.gameState;
    }

    // discrete collision detection, the standard for simple 2d physics
    // not mathematically perfect, but the continuous version is overkill
    update(dt, intentVec) {
        // reset temp effects first
        this.player.resetEffects();

        // move enemies
        for (const e of this.enemies) {
            e.move(dt, this.area);
        }
        // apply aura effects
        for (const e of this.enemies) {
            if (e.aura) {
                e.applyAura(this.player);
            }
        }

        // move player
        this.player.move(dt, intentVec, this.area);

        // check for player hit
        if (this.player.checkDead(this.enemies)) {
            //downPlayer();
        }
    }

    // later: linear interp to show frames between physics updates for high fps
    updateCamera() {
        this.camera.x = this.player.pos.x - Config.CONSTS.GAME_WIDTH / 2;
        this.camera.y = this.player.pos.y - Config.CONSTS.GAME_HEIGHT / 2;
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
    }

    // game initialization functions
    createArea({x, y, cols, rows, nodeSize, safeTileWidth}) {
        return {
            x, y, cols, rows, nodeSize,
            width: cols * nodeSize,
            height: rows * nodeSize,
            leftSafeX: x + nodeSize * safeTileWidth,
            rightSafeX: x + (cols * nodeSize) - (nodeSize * safeTileWidth)
        };
    }

    createPlayer(playerData) {
        return new Player(playerData.spawn, playerData.radius, playerData.speed);
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
}
