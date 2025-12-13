export default class Drawer {
    constructor() {
        // background canvas for drawing area, grid lines, nodes, paths
        this.backCanvas = document.getElementById("backCanvas");
        this.backCanvas.width = window.innerWidth;
        this.backCanvas.height = window.innerHeight;
        this.bgctx = this.backCanvas.getContext("2d");

        // normal game canvas for drawing player, enemies
        this.canvas = document.getElementById("gameCanvas");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext("2d");
    }

    drawArea(area, showGrid) {
        this.bgctx.fillStyle = "white";
        this.bgctx.fillRect(area.leftSafeX, area.y, area.width - (area.leftSafeX - area.x) * 2, area.height);

        this.bgctx.fillStyle = "lightgray";
        this.bgctx.fillRect(area.x, area.y, area.leftSafeX - area.x, area.height);
        this.bgctx.fillRect(area.rightSafeX, area.y, area.x + area.width - area.rightSafeX, area.height);
        if (showGrid) this.drawGrid(area);
    }

    drawGrid(area) {
        this.bgctx.strokeStyle = "#222";
        this.bgctx.lineWidth = 0.3;
        
        for (let x = area.x + area.nodeSize; x < area.x + area.width; x += area.nodeSize) {
            this.bgctx.beginPath();
            this.bgctx.moveTo(x, area.y);
            this.bgctx.lineTo(x, area.y + area.height);
            this.bgctx.stroke();
        }
        for (let y = area.y + area.nodeSize; y < area.y + area.height; y += area.nodeSize) {
            this.bgctx.beginPath();
            this.bgctx.moveTo(area.x, y);
            this.bgctx.lineTo(area.x + area.width, y);
            this.bgctx.stroke();
        }
    }

    drawPlayer(player) {
        //this.ctx.fillStyle = "#1E90FF";
        this.ctx.strokeStyle = "#1E90FF";
        this.ctx.beginPath();
        this.ctx.arc(player.pos.x, player.pos.y, player.radius, 0, 2 * Math.PI);
        //this.ctx.fill();
        this.ctx.stroke();
    }

    drawEnemies(enemies) {
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
        const auraGroups = new Map();
        for (const e of enemies) {
            if (!e.aura) continue;
            if (!auraGroups.has(e.type)) {
                auraGroups.set(e.type, [e]);
            } else {
                auraGroups.get(e.type).push(e);
            }
        }

        for (const group of auraGroups.values()) {
            this.ctx.fillStyle = group[0].auraColor;
            this.ctx.beginPath();
            for (const e of group) {
                this.ctx.moveTo(e.pos.x + e.auraRadius, e.pos.y);
                this.ctx.arc(e.pos.x, e.pos.y, e.auraRadius, 0, 2 * Math.PI);
            }
            this.ctx.fill();
        }
    }

    draw(gameState, camera) {
        this.bgctx.setTransform(1, 0, 0, 1, 0, 0);
        this.bgctx.fillStyle = "#222";
        this.bgctx.fillRect(0, 0, this.backCanvas.width, this.backCanvas.height);

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.bgctx.translate(-camera.x, -camera.y);
        this.ctx.translate(-camera.x, -camera.y);

        this.drawArea(gameState.area, gameState.settings.showGrid);
        this.drawPlayer(gameState.player);
        this.drawEnemies(gameState.enemies);
        this.drawAuras(gameState.enemies);
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

export function drawCircle(x, y, radius, thickness, color) {
    bgctx.strokeStyle = color;
    bgctx.lineWidth = thickness;
    bgctx.beginPath();
    bgctx.arc(x, y, radius, 0, 2 * Math.PI);
    bgctx.stroke();
}

export function drawLine(x, y, x2, y2, thickness, color) {
    bgctx.strokeStyle = color;
    bgctx.lineWidth = thickness;
    bgctx.beginPath();
    bgctx.moveTo(x, y);
    bgctx.lineTo(x2, y2);
    bgctx.stroke();
}

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

