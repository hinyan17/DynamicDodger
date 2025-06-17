/*
const canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");
ctx.fillStyle = "#222";
ctx.fillRect(0, 0, canvas.width, canvas.height);
*/

const backCanvas = document.getElementById("backCanvas");
backCanvas.width = window.innerWidth;
backCanvas.height = window.innerHeight;
const bgctx = backCanvas.getContext("2d");

const canvas = document.getElementById("gameCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");

// area is the background which uses the 2nd canvas
function drawArea(area) {
    bgctx.fillStyle = "#222";
    bgctx.fillRect(0, 0, backCanvas.width, backCanvas.height);
    bgctx.fillStyle = "white";
    bgctx.fillRect(area.x, area.y, area.width, area.height);

    bgctx.strokeStyle = "pink";
    bgctx.lineWidth = 1;
    bgctx.beginPath();
    bgctx.moveTo(area.leftSafeX, area.y);
    bgctx.lineTo(area.leftSafeX, area.y + area.height);
    bgctx.stroke();

    bgctx.beginPath();
    bgctx.moveTo(area.rightSafeX, area.y);
    bgctx.lineTo(area.rightSafeX, area.y + area.height);
    bgctx.stroke();
    //drawGrid(area);
}

function drawGrid(area) {
    bgctx.strokeStyle = "#222";
    bgctx.lineWidth = 0.5;
    
    for (let i = area.x + 16; i < area.x + area.width; i += 16) {
        bgctx.beginPath();
        bgctx.moveTo(i, area.y);
        bgctx.lineTo(i, area.y + area.height);
        bgctx.stroke();
    }
    for (let i = area.y + 16; i < area.y + area.height; i += 16) {
        bgctx.beginPath();
        bgctx.moveTo(area.x, i);
        bgctx.lineTo(area.x + area.width, i);
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

export {draw, drawArea, canvas};