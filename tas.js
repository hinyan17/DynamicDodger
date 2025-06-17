"use strict";
/*
const code = `
const nodeSize = 15;
const width = 100;

self.onmessage = e => {
  console.log('Worker got:', e.data);
  const enemies = new Float32Array(e.data);
  postMessage(enemies);
};
//# sourceURL=pathfinder.js
`;
const blob = new Blob([code], {type: "application/javascript"});
const worker = new Worker(URL.createObjectURL(blob));
worker.onmessage = e => {
    // execution layer
    console.log('Main got:', e.data);
}
*/
/*
(async function() {
    if (window.Heap) {console.log("heap-js already loaded"); return;}
    const { Heap } = await import("https://cdn.jsdelivr.net/npm/heap-js@2.6.0/dist/heap-js.es5.js");
    window.Heap = Heap;
    console.log("heap-js es5 loaded:", Heap);
})();
*/
const movePacket = (aimx, aimy) => ({
    "sequence": 0, "keys": [], "blockedUsernames": [], "unblockedUsernames": [],
    "mouseDown": {"x": aimx, "y": aimy, "updated": true}
});

const stopPacket = {
    "sequence": 0, "keys": [], "blockedUsernames": [], "unblockedUsernames": []
};
const gameState = gameObject.gameState;

const enemyBuffer = gameState.self.entity.radius + 15;
const nodeSize = 16;
const halfSize = nodeSize / 2;
const diagSize = nodeSize * Math.SQRT2;
const areaWidth = gameState.area.width;
const areaHeight = gameState.area.height;
const cols = Math.ceil(areaWidth / nodeSize);
const rows = Math.ceil(areaHeight / nodeSize);
const graph = [];

for (let r = 0; r < rows; r++) {
    graph[r] = [];
    for (let c = 0; c < cols; c++) {
        graph[r][c] = {
            x: c * nodeSize + halfSize,
            y: r * nodeSize + halfSize,
            g: Infinity,
            rhs: Infinity,
            neighbors: []
        };
    }
}

const dirs = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];
for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const u = graph[r][c];
        for (const [dr, dc] of dirs) {
            const newR = r + dr;
            const newC = c + dc;
            if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
                const cost = (dr !== 0 && dc !== 0) ? diagSize : nodeSize;
                u.neighbors.push({node: graph[newR][newC], cost: cost});
            } else {
                u.neighbors.push(null);
            }
        }
    }
}

let startNode = nodeFromPos(176, areaHeight / 2);
let goalNode = nodeFromPos(areaWidth - 176, areaHeight / 2);
goalNode.rhs = 0;
let km = 0;
let lastStart = startNode;

const comparator = (a, b) => a.k1 !== b.k1 ? a.k1 - b.k1 : a.k2 - b.k2;
const open = new window.Heap(comparator);
const entries = new Map();
updateVertex(goalNode);
computeShortestPath();

function navigateTo(node, px, py) {
    const theta = Math.atan2(node.y - py, node.x - px);
    const nx = Math.round(300 * Math.cos(theta));
    const ny = Math.round(300 * Math.sin(theta));
    const move = movePacket(nx, ny);
    socket.send(protobuf.ClientPayload.encode(protobuf.ClientPayload.create(move)).finish());
}

let prevBlocked = new Set();
let currBlocked = new Set();
function main() {
    const t1 = window.performance.now();
    if (startNode === goalNode) {console.log("reached goal"); return;}
    if (startNode.rhs === Infinity) {console.log("no path found"); return;}
    
    const px = Math.round(gameState.self.entity.x) - gameState.area.x;
    const py = Math.round(gameState.self.entity.y) - gameState.area.y;
    const physNode = nodeFromPos(px, py);
    if (physNode === startNode) {
        // only move startNode if bot is currently in startNode
        // if it isn't in startNode, it is lagging behind, so the rest of 
        // the algorithm will update while keeping the path fixed at startNode
        let bestEdge = null;
        let bestCost = Infinity;
        for (let edge of startNode.neighbors) {
            if (edge === null) continue;
            const newCost = edge.cost + edge.node.g;
            if (newCost < bestCost) {
                bestEdge = edge;
                bestCost = newCost;
            }
        }
        startNode = bestEdge.node;
    }
    
    // move to startNode, whether changed or not
    navigateTo(startNode, px, py);
    
    detectEnemyChanges();
    const nodesToUnblock = prevBlocked.difference(currBlocked);
    const nodesToBlock = currBlocked.difference(prevBlocked);
    if (nodesToUnblock.size > 0 || nodesToBlock.size > 0) {
        km += heuristic(lastStart, startNode);
        lastStart = startNode;
        batchUpdateGraph(nodesToUnblock, false);
        batchUpdateGraph(nodesToBlock, true);
        computeShortestPath();
    }

    const temp = prevBlocked;
    prevBlocked = currBlocked;
    currBlocked = temp;
    currBlocked.clear();
    console.log(window.performance.now() - t1);
}

function batchUpdateGraph(nodeList, block) {
    for (const index of nodeList) {
        const r = Math.floor(index / cols);                //const r = (index / cols) | 0;
        const c = index % cols;                            //const c = index - r * cols;
        const node = graph[r][c];
        let minCG = Infinity;
        let bestHit = false;
        for (let i = 0; i < node.neighbors.length; i++) {
            const edge = node.neighbors[i];
            if (edge === null) continue;
            const inverse = i > 3 ? i - 4 : i + 4;         //(i + 4) & 7;
            const invEdge = edge.node.neighbors[inverse];
            const oldCost = edge.cost;
            const newCost = block ? Infinity : ((i % 2 === 0) ? nodeSize : diagSize);
            minCG = Math.min(minCG, newCost + edge.node.g);
            
            edge.cost = newCost;
            invEdge.cost = newCost;
            if (node === goalNode) continue;
            if (oldCost > newCost) {
                node.rhs = Math.min(node.rhs, newCost + edge.node.g);
            } else if (node.rhs === oldCost + edge.node.g) {
                bestHit = true;
            }
        }
        if (bestHit) {
            node.rhs = minCG;
        }
        updateVertex(node);
    }
}

function updateVertex(node) {
    if (node.g !== node.rhs) {
        // node is inconsistent -> update / add to open
        if (entries.has(node)) {
            open.remove(entries.get(node));
        }
        const entry = calculateKey(node);
        open.push(entry);
        entries.set(node, entry);
    } else if (entries.has(node)) {
        // node is consistent -> remove from open
        open.remove(entries.get(node));
        entries.delete(node);
    }
}

function computeShortestPath() {
    while (true) {
        const entry = open.peek();
        const startEntry = calculateKey(startNode);
        if (entry === undefined) {console.log("OPEN empty"); break;}
        if (comparator(entry, startEntry) >= 0 && startNode.rhs <= startNode.g) break;
        
        const node = entry.node;
        const newEntry = calculateKey(node);
        if (comparator(entry, newEntry) < 0) {
            // update the open queue
            open.remove(entries.get(node));
            open.push(newEntry);
            entries.set(node, newEntry);
        } else if (node.g > node.rhs) {
            node.g = node.rhs;
            open.remove(entries.get(node));
            entries.delete(node);
            for (let edge of node.neighbors) {
                if (edge === null) continue;
                const s = edge.node, c = edge.cost;
                if (s !== goalNode) {
                    s.rhs = Math.min(s.rhs, c + node.g);
                }
                updateVertex(s);
            }
        } else {
            const gOld = node.g;
            node.g = Infinity;
            node.neighbors.push({node: node, cost: 0});
            for (let edge of node.neighbors) {
                if (edge === null) continue;
                const s = edge.node, c = edge.cost;
                if (s !== goalNode && s.rhs === c + gOld) {
                    let best = Infinity;
                    for (let edge2 of s.neighbors) {
                        if (edge2 === null) continue;
                        best = Math.min(best, edge2.cost + edge2.node.g);
                    }
                    s.rhs = best;
                }
                updateVertex(s);
            }
            node.neighbors.pop();
        }
    }
}

function calculateKey(node) {
    const min = Math.min(node.g, node.rhs);
    return {
        node: node,
        k1: min + heuristic(node) + km,
        k2: min
    };
}

function heuristic(node) {
    const dx = node.x - startNode.x;
    const dy = node.y - startNode.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function nodeFromPos(x, y) {
    if (x < 0 || y < 0 || x >= areaWidth || y >= areaHeight) throw new Error("Out of bounds");
    const row = Math.floor(y / nodeSize);
    const col = Math.floor(x / nodeSize);
    return graph[row][col];
}

function circleOverlapsCell(cx, cy, r, ux, uy) {
    const dx = Math.max(Math.abs(cx - ux) - halfSize, 0);
    const dy = Math.max(Math.abs(cy - uy) - halfSize, 0);
    return dx*dx + dy*dy <= r*r;
}

function detectEnemyChanges() {
    const enemyList = sendData(0);
    for (let i = 0; i < enemyList.length; i += 3) {
        const radius = enemyList[i] + enemyBuffer;
        const x = enemyList[i+1];
        const y = enemyList[i+2];
        const minC = Math.max(0, Math.floor((x - radius) / nodeSize));
        const maxC = Math.min(cols - 1, Math.floor((x + radius) / nodeSize));
        const minR = Math.max(0, Math.floor((y - radius) / nodeSize));
        const maxR = Math.min(rows - 1, Math.floor((y + radius) / nodeSize));
    
        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const node = graph[r][c];
                if (circleOverlapsCell(x, y, radius, node.x, node.y)) {
                    currBlocked.add(r * cols + c);
                }
            }
        }
    }
}

function sendData(e) {
    const ids = [];
    for (const id in gameState.entities) {
        if (2 <= gameState.entities[id].entityType && gameState.entities[id].entityType <= 7) {
            ids.push(id);
        }
    }

    const data = new Float32Array(ids.length * 3);
    for (let i = 0; i < ids.length; i++) {
        const enemy = gameState.entities[ids[i]];
        data[3*i] = enemy.radius;
        data[3*i + 1] = Math.round(enemy.x) - gameState.area.x;
        data[3*i + 2] = Math.round(enemy.y) - gameState.area.y;
    }
    //worker.postMessage(data.buffer, [data.buffer]);
    //console.log(data);
    return data;
}

let flag = true;
document.onkeydown = e => {
    switch (e.key) {
        case "\\": {
            if (flag) {
                //socket.addEventListener("message", sendData);
                socket.addEventListener("message", main);
            } else {
                //socket.removeEventListener("message", sendData);
                socket.removeEventListener("message", main);
            }
            flag = !flag;
            break;
        }
    }
}
