// background canvas for drawing area, grid lines, nodes, paths
const backCanvas = document.getElementById("backCanvas");
backCanvas.width = window.innerWidth;
backCanvas.height = window.innerHeight;
const bgctx = backCanvas.getContext("2d");
bgctx.fillStyle = "#222";
bgctx.fillRect(0, 0, backCanvas.width, backCanvas.height);

// normal game canvas for drawing player, enemies
export const canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

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

export function drawVO(vo, px, py) {
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

export function drawVO2(vo, px, py) {
    const scale = 1;
    const ax = px + vo.apex.x * scale;
    const ay = py + vo.apex.y * scale;

    const leftAng = Math.atan2(vo.leftLeg.y,  vo.leftLeg.x);
    const rightAng = Math.atan2(vo.rightLeg.y, vo.rightLeg.x);
    const r = 100 * scale;

    // fill the wedge
    bgctx.fillStyle = "rgba(255,0,0,0.2)";
    bgctx.beginPath();
    bgctx.moveTo(ax, ay);
    // line along left leg
    bgctx.lineTo(ax + Math.cos(leftAng) * r, ay + Math.sin(leftAng) * r);
    // arc from left → right sweeping inside the cone
    bgctx.arc(ax, ay, r, leftAng, rightAng, true);
    bgctx.lineTo(ax, ay);
    bgctx.fill();
}

export function drawArea(area, showGrid) {
    bgctx.fillStyle = "white";
    bgctx.fillRect(area.leftSafeX, area.y, area.width - (area.leftSafeX - area.x) * 2, area.height);

    bgctx.fillStyle = "lightgray";
    bgctx.fillRect(area.x, area.y, area.leftSafeX - area.x, area.height);
    bgctx.fillRect(area.rightSafeX, area.y, area.x + area.width - area.rightSafeX, area.height);
    if (showGrid) drawGrid(area);
}

function drawGrid(area) {
    bgctx.strokeStyle = "#222";
    bgctx.lineWidth = 0.3;
    
    for (let x = area.x + area.nodeSize; x < area.x + area.width; x += area.nodeSize) {
        bgctx.beginPath();
        bgctx.moveTo(x, area.y);
        bgctx.lineTo(x, area.y + area.height);
        bgctx.stroke();
    }
    for (let y = area.y + area.nodeSize; y < area.y + area.height; y += area.nodeSize) {
        bgctx.beginPath();
        bgctx.moveTo(area.x, y);
        bgctx.lineTo(area.x + area.width, y);
        bgctx.stroke();
    }
}

function drawPlayer(player) {
    //ctx.fillStyle = "#1E90FF";
    ctx.strokeStyle = "#1E90FF";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, 2 * Math.PI);
    //ctx.fill();
    ctx.stroke();
}

function drawEnemies(enemies) {
    //ctx.fillStyle = "black";
    ctx.strokeStyle = "black";

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, 2 * Math.PI);
        //ctx.fill();
        ctx.stroke();
    }
}

export function draw(gameState) {
    ctx.clearRect(gameState.area.x, gameState.area.y, gameState.area.width, gameState.area.height);
    drawPlayer(gameState.player);
    drawEnemies(gameState.enemies);
}
