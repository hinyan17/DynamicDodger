import { CONSTS } from "./config.js";
import { ZoneColors } from "./utils.js";

export default class Drawer {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = CONSTS.GAME_WIDTH;
        this.canvas.height = CONSTS.GAME_HEIGHT;
        this.debugQueue = [];

        this.resize();
    }

    resize() {
        const innerW = window.innerWidth;
        const innerH = window.innerHeight;

        // use the smaller scale (aspect fit)
        const xScale = innerW / CONSTS.GAME_WIDTH;
        const yScale = innerH / CONSTS.GAME_HEIGHT;
        const scale = Math.min(xScale, yScale);
        this.canvas.style.transform = `scale(${scale})`;

        // center the canvas
        this.canvas.style.left = `${(innerW - CONSTS.GAME_WIDTH) / 2}px`;
        this.canvas.style.top = `${(innerH - CONSTS.GAME_HEIGHT) / 2}px`;
    }

    draw(game, opts) {
        // reset canvas transformation and fill with dark gray
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // apply scale to match
        this.ctx.scale(CONSTS.SCALE_FACTOR, CONSTS.SCALE_FACTOR);

        // camera uses original canvas dimensions
        // fix the center shift caused by scaling: (original − scaled) / 2
        const offsetX = (this.canvas.width - (this.canvas.width / CONSTS.SCALE_FACTOR)) / 2;
        const offsetY = (this.canvas.height - (this.canvas.height / CONSTS.SCALE_FACTOR)) / 2;

        // apply corrected camera translation (shifts origin)
        this.ctx.translate(-game.activePlayer.camera.x - offsetX, -game.activePlayer.camera.y - offsetY);

        // right now draw everything, later change to drawing only activePlayer current area
        // const loc = game.playerLocations.get(activePlayer.id);
        // const area = game.worlds[loc.worldId].areas[loc.areaId];
        for (const [worldId, areaIdSet] of game.loadedAreas) {
            for (const areaId of areaIdSet) {
                const world = game.worlds[worldId];
                const area = world.areas[areaId];
                this.ctx.save();
                this.ctx.translate(world.pos.x + area.pos.x, world.pos.y + area.pos.y);

                this.drawZones(area.zones);
                this.drawTint(area.color, area.size);
                if (opts.grid) this.drawGrid(area.size);
                if (opts.pellets) this.drawPellets(area.pellets);
                const players = game.playersByArea.get(area) ?? [];
                this.drawPlayers(players, opts.fill, opts.extras);
                this.drawAuras(area.enemies);
                this.drawEnemies(area.enemies, opts.fill, opts.outline);

                this.ctx.restore();
            }
        }

        //this.drawDebug();
    }

    // all these draw in area-local space
    drawZones(zones) {
        for (const z of zones) {
            this.ctx.fillStyle = ZoneColors[z.type];
            this.ctx.fillRect(z.pos.x, z.pos.y, z.size.x, z.size.y);
        }
    }

    drawTint(color, areaSize) {
        // background tint
        if (!color) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, areaSize.x, areaSize.y);
    }

    drawGrid(areaSize) {
        this.ctx.strokeStyle = "#222";
        this.ctx.lineWidth = 0.3;
        const tileSize = 32;

        // vertical lines
        for (let x = tileSize; x < areaSize.x; x += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, areaSize.y);
            this.ctx.stroke();
        }

        // horizontal lines
        for (let y = tileSize; y < areaSize.y; y += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(areaSize.x, y);
            this.ctx.stroke();
        }
    }

    drawPellets(pellets) {
        for (const p of pellets) {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.pos.x, p.pos.y, p.getEffectiveRadius(), 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    drawPlayers(players, showFill, showExtras) {
        for (const p of players) {
            this.ctx.beginPath();
            this.ctx.arc(p.pos.x, p.pos.y, p.radius, 0, 2 * Math.PI);
            if (showFill) {
                // draw main body
                this.ctx.save();
                this.ctx.fillStyle = p.color;
                if (p.isDowned()) {
                    this.ctx.globalAlpha = 0.4;
                }
                this.ctx.fill();
                this.ctx.restore();

                // draw extras
                if (showExtras) {
                    this.drawExtras(p);
                }

                // draw downed timer
                if (p.isDowned()) {
                    this.ctx.fillStyle = "red";
                    this.ctx.font = "16px Tahoma, Verdana, Segoe, sans-serif";
                    this.ctx.textAlign = "center";
                    this.ctx.fillText(Math.floor(p.downedTimer).toFixed(0), p.pos.x, p.pos.y + 6);
                }
            } else {
                this.ctx.lineWidth = 1;
                this.ctx.strokeStyle = p.color;
                this.ctx.stroke();
            }
        }
    }

    drawExtras(p) {
        const WREATH_SIZE = 50;
        const ENERGY_BAR_WIDTH = 36;
        const ENERGY_BAR_HEIGHT = 7;
        const ENERGY_BAR_Y_OFFSET = 8;
        const NAME_Y_OFFSET = 11;
        const NAME_FONT = "12px Tahoma, Verdana, Segoe, sans-serif";

        // name
        this.ctx.fillStyle = "black";
        this.ctx.font = NAME_FONT;
        this.ctx.textAlign = "center";
        this.ctx.fillText(p.name, p.pos.x, p.pos.y - p.radius - NAME_Y_OFFSET);

        // energy bar
        const energyBarY = p.pos.y - p.radius - ENERGY_BAR_Y_OFFSET;
        this.ctx.fillStyle = "blue";
        this.ctx.fillRect(p.pos.x - ENERGY_BAR_WIDTH / 2, energyBarY, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT);
        // energy bar outline
        this.ctx.strokeStyle = "rgb(68, 118, 255)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(p.pos.x - ENERGY_BAR_WIDTH / 2, energyBarY, ENERGY_BAR_WIDTH, ENERGY_BAR_HEIGHT);

        // hat
        this.ctx.save();
        if (p.isDowned()) {
            this.ctx.globalAlpha = 0.4;
        }
        if (p.accessories.hat.complete) {
            const wreathX = p.pos.x - WREATH_SIZE / 2;
            const wreathY = p.pos.y - WREATH_SIZE / 2;
            this.ctx.drawImage(p.accessories.hat, wreathX, wreathY, WREATH_SIZE, WREATH_SIZE);
            // gem
            if (p.accessories.isCrown) {
                this.ctx.drawImage(p.accessories.gem, wreathX, wreathY, WREATH_SIZE, WREATH_SIZE);
            }
        }
        this.ctx.restore();
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

    drawEnemies(enemies, showFill, showOutline) {
        for (const e of enemies) {
            this.ctx.beginPath();
            this.ctx.arc(e.pos.x, e.pos.y, e.radius, 0, 2 * Math.PI);

            if (showFill) {
                this.ctx.fillStyle = e.color;
                this.ctx.fill();
                if (showOutline) {
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = "#ffffff";
                }
            } else {
                this.ctx.lineWidth = 1;
                this.ctx.strokeStyle = e.color;
            }
            this.ctx.stroke();
        }
    }

    /*
    -------- debug drawing queue for nodes, paths, indicators, etc ----------------------------------
    Single responsibilities: update() manages state (what should be drawn), draw() manages how to draw

    although debug drawing data is generated before update(), it should not be drawn until draw() runs.
    therefore, the queue. this is cleaner and more efficient than managing two canvases.

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

