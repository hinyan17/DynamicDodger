import Heap from "./heap-js.es5.js";
import {drawArea, fillNodes, outlineNodes, markNodes} from "./drawer.js"

export default function TAS(gameState) {
    
    const enemyBuffer = gameState.player.radius + 10;
    const nodeSize = gameState.area.nodeSize;
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
                x: c * nodeSize + halfSize + gameState.area.x,
                y: r * nodeSize + halfSize + gameState.area.y,
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

    let startNode = nodeFromPos(96, gameState.area.y + areaHeight / 2);
    let goalNode = nodeFromPos(areaWidth - 96, gameState.area.y + areaHeight / 2);
    goalNode.rhs = 0;
    let km = 0;
    let lastStart = startNode;

    const comparator = (a, b) => a.k1 !== b.k1 ? a.k1 - b.k1 : a.k2 - b.k2;
    const open = new Heap(comparator);
    const entries = new Map();
    let prevBlocked = new Set();
    let currBlocked = new Set();
    //updateVertex(goalNode);
    //computeShortestPath();

    function test() {
        drawArea(gameState.area, true);
        detectEnemyChanges();
        const nodesToUnblock = prevBlocked.difference(currBlocked);
        const nodesToBlock = currBlocked.difference(prevBlocked);

        //fillNodes(nodesToUnblock, "lightgreen", halfSize, cols, graph);
        //fillNodes(nodesToBlock, "lightpink", halfSize, cols, graph);
        fillNodes(currBlocked, "lightgreen", halfSize, cols, graph);
        /*
        fillNodes(currBlocked, "lightgreen", halfSize, cols, graph);
        outlineNodes(prevBlocked, "crimson", halfSize, cols, graph);
        markNodes(nodesToUnblock, "lightskyblue", halfSize, cols, graph);
        markNodes(nodesToBlock, "violet", halfSize, cols, graph);
        */
        //console.log(nodesToUnblock, nodesToBlock);

        const temp = prevBlocked;
        prevBlocked = currBlocked;
        currBlocked = temp;
        currBlocked.clear();
    }

    function circleOverlapsCell(cx, cy, r, ux, uy) {
        const dx = Math.max(Math.abs(cx - ux) - halfSize, 0);
        const dy = Math.max(Math.abs(cy - uy) - halfSize, 0);
        return dx*dx + dy*dy <= r*r;
    }

    function detectEnemyChanges() {
        for (let i = 0; i < gameState.enemies.length; i++) {
            const radius = gameState.enemies[i].radius + enemyBuffer;
            const x = gameState.enemies[i].x;
            const y = gameState.enemies[i].y;

            // refactor this mess later...
            const minC = Math.max(0, Math.floor((x - gameState.area.x - radius) / nodeSize));
            const maxC = Math.min(cols - 1, Math.floor((x - gameState.area.x + radius) / nodeSize));
            const minR = Math.max(0, Math.floor((y - gameState.area.y - radius) / nodeSize));
            const maxR = Math.min(rows - 1, Math.floor((y - gameState.area.y + radius) / nodeSize));

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


    function main() {
        const t1 = performance.now();
        if (startNode === goalNode) {console.log("reached goal"); return;}
        if (startNode.rhs === Infinity) {console.log("no path found"); return;}

        // move to startNode, whether changed or not
        gameState.player.x = startNode.x;
        gameState.player.y = startNode.y;

        detectEnemyChanges();
        const nodesToUnblock = prevBlocked.difference(currBlocked);
        const nodesToBlock = currBlocked.difference(prevBlocked);
        console.log(nodesToUnblock, nodesToBlock);

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
        //console.log(performance.now() - t1);
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

    return {test};
}



