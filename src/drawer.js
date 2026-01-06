import { GAME_WIDTH, GAME_HEIGHT } from "./config.js";

export default class Drawer {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;
        this.debugQueue = [];

        this.resize = this.resize.bind(this);
        this.resize();
    }

    resize() {
        const innW = window.innerWidth;
        const innH = window.innerHeight;

        // use the smaller scale (aspect fit)
        const xvalue = innW / GAME_WIDTH;
        const yvalue = innH / GAME_HEIGHT;
        const scale = Math.min(xvalue, yvalue);
        this.canvas.style.transform = `scale(${scale})`;

        // center the canvas
        this.canvas.style.left = `${(innW - GAME_WIDTH) / 2}px`;
        this.canvas.style.top = `${(innH - GAME_HEIGHT) / 2}px`;
    }

    drawArea(area, showGrid) {
        // main area
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(area.leftSafeX, area.y, area.width - (area.leftSafeX - area.x) * 2, area.height)

        // safe zones
        this.ctx.fillStyle = "lightgray";
        this.ctx.fillRect(area.x, area.y, area.leftSafeX - area.x, area.height);
        this.ctx.fillRect(area.rightSafeX, area.y, area.x + area.width - area.rightSafeX, area.height);
        if (showGrid) this.drawGrid(area);
    }

    drawGrid(area) {
        this.ctx.strokeStyle = "#222";
        this.ctx.lineWidth = 0.3;

        // vertical lines
        for (let x = area.x + area.nodeSize; x < area.x + area.width; x += area.nodeSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, area.y);
            this.ctx.lineTo(x, area.y + area.height);
            this.ctx.stroke();
        }

        // horizontal lines
        for (let y = area.y + area.nodeSize; y < area.y + area.height; y += area.nodeSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(area.x, y);
            this.ctx.lineTo(area.x + area.width, y);
            this.ctx.stroke();
        }
    }

    drawPlayer(player) {
        this.ctx.lineWidth = 1;
        //this.ctx.fillStyle = "#1E90FF";
        this.ctx.strokeStyle = "#1E90FF";
        this.ctx.beginPath();
        this.ctx.arc(player.pos.x, player.pos.y, player.radius, 0, 2 * Math.PI);
        //this.ctx.fill();
        this.ctx.stroke();
    }

    drawEnemies(enemies) {
        this.ctx.lineWidth = 1;
        for (const e of enemies) {
            //ctx.fillStyle = e.color;
            this.ctx.strokeStyle = e.color;
            this.ctx.beginPath();
            this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, 2 * Math.PI);
            //ctx.fill();
            this.ctx.stroke();
        }
    }

    drawAuras(enemies) {
        // group enemies of the same aura type
        const auraGroups = new Map();
        for (const e of enemies) {
            if (!e.aura) continue;
            if (!auraGroups.has(e.type)) {
                auraGroups.set(e.type, [e]);
            } else {
                auraGroups.get(e.type).push(e);
            }
        }

        // draw each group continuously (no overlap between same auras)
        for (const group of auraGroups.values()) {
            this.ctx.fillStyle = group[0].aura.color;
            this.ctx.beginPath();
            for (const e of group) {
                this.ctx.moveTo(e.pos.x + e.aura.radius, e.pos.y);
                this.ctx.arc(e.pos.x, e.pos.y, e.aura.radius, 0, 2 * Math.PI);
            }
            this.ctx.fill();
        }
    }

    draw(gameState) {
        // reset gamecanvas transformation and fill with dark gray
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // apply scale to match original. this took hours to find
        const scaleFactor = 1.5;
        this.ctx.scale(scaleFactor, scaleFactor);

        // calculate the offset
        // the camera thinks the screen is 1920px wide (center 960)
        // the scale makes the screen effectively 1280px wide (center 640)
        // the world needs to shift by the difference (320px) to realign the centers
        // formula: (currentWidth - (currentWidth / scale)) / 2
        const offsetX = (this.canvas.width - (this.canvas.width / scaleFactor)) / 2;
        const offsetY = (this.canvas.height - (this.canvas.height / scaleFactor)) / 2;

        // apply the offset to the camera position
        this.ctx.translate(
            -gameState.camera.x - offsetX,
            -gameState.camera.y - offsetY
        );

        this.drawArea(gameState.area, gameState.settings.showGrid);
        this.drawPlayer(gameState.player);
        this.drawEnemies(gameState.enemies);
        this.drawAuras(gameState.enemies);
        this.drawDebug();
    }

    /*
    -------- debug drawing queue for nodes, paths, indicators, etc, created in game.update() --------
    SEPARATION OF CONCERNS
    update(): manages state (what should be drawn?)
    draw(): manages how to draw

    these responsibilities should not change. although debug drawing data is generated in update(), it should not be drawn
    until draw() runs. therefore, the queue. this is much cleaner and efficient than managing two canvases.
    that approach couples the responsibilities and inevitably introduces visual bugs.

    the queue works regardless of the difference between fps and tps:
    higher fps (screen > game): update() runs rarely, the queue sits untouched between updates. draw() redraws the queue.
    higher tps (game > screen): update() runs in bursts, the queue is constantly changing. draw() draws the queue's final state.
    -------------------------------------------------------------------------------------------------
    */
    drawDebug() {
        for (const drawFn of this.debugQueue) {
            drawFn();
        }
    }

    clearDebugQueue() {
        this.debugQueue = [];
    }

    queueDrawCircle(x, y, radius, thickness, color) {
        // closure captures necessary vars
        this.debugQueue.push(() => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = thickness;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        });
    }

    queueDrawLine(x, y, x2, y2, thickness, color) {
        this.debugQueue.push(() => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = thickness;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });
    }
}
/*
export function fillNode(n, halfSize, color) {
    bgctx.fillStyle = color;
    bgctx.fillRect(n.x - halfSize + 1, n.y - halfSize + 1, halfSize * 2 - 2, halfSize * 2 - 2);
}

export function fillNodes(nodes, halfSize, color) {
    bgctx.fillStyle = color;
    for (const n of nodes) {
        bgctx.fillRect(n.x - halfSize + 1, n.y - halfSize + 1, halfSize * 2 - 2, halfSize * 2 - 2);
    }
}

export function outlineNodes(nodes, halfSize, color) {
    bgctx.strokeStyle = color;
    bgctx.lineWidth = 1;
    for (const n of nodes) {
        bgctx.strokeRect(n.x - halfSize, n.y - halfSize, halfSize * 2, halfSize * 2);
    }
}

export function markNodes(nodes, halfSize, color) {
    bgctx.fillStyle = color;
    for (const n of nodes) {
        bgctx.beginPath();
        bgctx.arc(n.x, n.y, halfSize / 2, 0, 2 * Math.PI);
        bgctx.fill();
    }
}

export function drawPathLine(nodes, color) {
    bgctx.strokeStyle = color;
    bgctx.lineWidth = 1;
    bgctx.beginPath();
    bgctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
        bgctx.lineTo(nodes[i].x, nodes[i].y);
    }
    bgctx.stroke();
}

export function drawSquare(x, y, halfSize, color) {
    bgctx.fillStyle = color;
    bgctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
}

// drawCircle

// drawLine

export function drawVo(vo, px, py) {
    const S = 120;

    bgctx.lineWidth = 2;
    const leftAng = Math.atan2(vo.leftLeg.y,  vo.leftLeg.x);
    const rightAng = Math.atan2(vo.rightLeg.y, vo.rightLeg.x);

    bgctx.beginPath();
    bgctx.moveTo(px, py);
    bgctx.lineTo(px + vo.leftLeg.x * S, py + vo.leftLeg.y * S);

    // use the correct direction flag to sweep inside the cone
    bgctx.arc(px, py, S, leftAng, rightAng, true);
    bgctx.lineTo(px, py);

    bgctx.fillStyle = "rgba(255,0,0,0.2)";
    bgctx.fill();
}
*/

