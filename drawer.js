const backCanvas = document.getElementById("backCanvas");
backCanvas.width = window.innerWidth;
backCanvas.height = window.innerHeight;
const bgctx = backCanvas.getContext("2d");

const canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

function drawNodes(nodes, color, halfSize, cols, graph) {
    bgctx.fillStyle = color;
    for (const index of nodes) {
        const n = graph[Math.floor(index / cols)][index % cols];
        bgctx.fillRect(n.x - halfSize, n.y - halfSize, halfSize * 2, halfSize * 2);
    }
}

// area is the background which uses the 2nd canvas
function drawArea(area, showGrid) {
    bgctx.fillStyle = "#222";
    bgctx.fillRect(0, 0, backCanvas.width, backCanvas.height);

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
    ctx.fillStyle = "#1E90FF";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, 2 * Math.PI);
    ctx.fill();
}

function drawEnemies(enemies) {
    ctx.fillStyle = "black";

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function draw(gameState) {
    ctx.clearRect(gameState.area.x, gameState.area.y, gameState.area.width, gameState.area.height);
    drawPlayer(gameState.player);
    drawEnemies(gameState.enemies);
}

export {canvas, draw, drawArea, drawNodes};
