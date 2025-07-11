import Heap from "./heap-js.es5.js";
import * as Drawer from "./drawer.js"

export default function TAS(gameState, settings) {

    const enemyBuffer = gameState.player.radius + 5;
    /*
    const nodeSize = gameState.area.nodeSize;
    const halfSize = nodeSize / 2;
    const diagSize = nodeSize * Math.SQRT2;
    const areaWidth = gameState.area.width;
    const areaHeight = gameState.area.height;
    const cols = Math.ceil(areaWidth / nodeSize);
    const rows = Math.ceil(areaHeight / nodeSize);
    */
    const areaWidth = gameState.area.width;
    const areaHeight = gameState.area.height;
    const cols = gameState.area.cols;
    const rows = gameState.area.rows;
    const nodeSize = gameState.area.nodeSize;
    const halfSize = nodeSize / 2;
    const diagSize = nodeSize * Math.SQRT2;
    const graph = [];

    //let nodeId = 0;
    //const pblocked = new Set();
    for (let r = 0; r < rows; r++) {
        graph[r] = [];
        for (let c = 0; c < cols; c++) {
            const x = c * nodeSize + halfSize + gameState.area.x;
            const y = r * nodeSize + halfSize + gameState.area.y;
            const inBounds = (
                x - gameState.player.radius >= gameState.area.x &&
                x + gameState.player.radius < gameState.area.x + areaWidth &&
                y - gameState.player.radius >= gameState.area.y &&
                y + gameState.player.radius < gameState.area.y + areaHeight
            );
            
            graph[r][c] = {
                x: x,
                y: y,
                neighbors: [],
                permBlocked: !inBounds,
                runId: 0,
                g: Infinity,
                f: Infinity,
                prev: null,
                closed: false
            };
            //if (!inBounds) pblocked.add(graph[r][c]);
        }
    }
    //Drawer.fillNodes(pblocked, halfSize, "orange");

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
                }
            }
        }
    }

    let currentRunId = -1;
    let startNode = nodeFromPos(gameState.area.leftSafeX / 2, gameState.area.y + areaHeight / 2);
    let goalNode = nodeFromPos(gameState.area.rightSafeX + (gameState.area.leftSafeX / 2), gameState.area.y + areaHeight / 2);
    const comparator = (a, b) => {
        if (a.f !== b.f) {
            return a.f - b.f;
        }
        return b.node.g - a.node.g;
    };
    //const comparator = (a, b) => a.f - b.f;
    const openHeap = new Heap(comparator);
    const blockedSet = new Set();
    // g, f, prev, and closed are now built into the graph with runId

    function astar() {
        if (startNode === goalNode) {
            console.log("reached goal");
            return null;
        }

        currentRunId++;
        openHeap.clear();
        detectEnemyChanges(blockedSet);

        lazyInit(startNode);
        startNode.g = 0;
        startNode.f = heuristic(startNode);
        openHeap.push({node: startNode, f: startNode.f});

        let best = startNode;
        let bestH = heuristic(startNode);
        //let expansions = 0;
        // agent's field of view radius squared
        const r2 = (nodeSize * 40)**2;

        while (!openHeap.isEmpty()) {
            //expansions++;
            const {node: current, f} = openHeap.pop();
            lazyInit(current);
            if (f > current.f) continue;
            if (current.closed) continue;
            if (current === goalNode) return reconstructPath(current);

            const currH = heuristic(current);
            if (currH < bestH) {
                best = current;
                bestH = currH;
            }

            current.closed = true;
            for (const {node: nbr, cost} of current.neighbors) {
                lazyInit(nbr);
                if (blockedSet.has(nbr) || nbr.closed || nbr.permBlocked) continue;

                // limit search horizon to some distance R from startNode
                const dx = nbr.x - startNode.x;
                const dy = nbr.y - startNode.y;
                if (dx*dx + dy*dy > r2) continue;

                const tentativeG = current.g + cost;
                if (tentativeG < nbr.g) {
                    nbr.g = tentativeG;
                    nbr.f = tentativeG + heuristic(nbr);
                    nbr.prev = current;
                    openHeap.push({node: nbr, f: nbr.f});
                }
            }
        }
        //console.log(best === startNode ? "returning no path" : "returning partial path");
        return reconstructPath(best);
    }

    function lazyInit(node) {
        if (node.runId !== currentRunId) {
            node.runId = currentRunId;
            node.g = Infinity;
            node.f = Infinity;
            node.prev = null;
            node.closed = false;
        }
    }

    function reconstructPath(current) {
        const path = [current];
        while (current.prev !== null) {
            current = current.prev;
            path.push(current);
        }
        return path.reverse();
    }

    function testPath() {
        Drawer.drawArea(gameState.area, settings.showGrid);
        let path = astar();
        if (path !== null && path.length > 1) {
            Drawer.fillNode(path[0], halfSize, "red");
            Drawer.fillNode(path[path.length - 1], halfSize, "green");
            Drawer.drawPathLine(path, "blue");
            //startNode = path[1];
            return path;
        }
        return null;
    }

    function updateStart() {
        startNode = nodeFromPos(gameState.player.x, gameState.player.y);
    }

    function heuristic(node) {
        const dx = node.x - goalNode.x;
        const dy = node.y - goalNode.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    function nodeFromPos(x, y) {
        const lx = x - gameState.area.x;
        const ly = y - gameState.area.y;
        if (lx < 0 || ly < 0 || lx >= areaWidth || ly >= areaHeight) {
            throw new Error("Out of bounds");
        }
        return graph[Math.floor(ly / nodeSize)][Math.floor(lx / nodeSize)];
    }

    function circleOverlapsCell(cx, cy, r, ux, uy) {
        const dx = Math.max(Math.abs(cx - ux) - halfSize, 0);
        const dy = Math.max(Math.abs(cy - uy) - halfSize, 0);
        return dx*dx + dy*dy <= r*r;
    }

    function detectEnemyChanges(blocked) {
        blocked.clear();
        for (let i = 0; i < gameState.enemies.length; i++) {
            const radius = gameState.enemies[i].radius + enemyBuffer;
            const x = gameState.enemies[i].x;
            const y = gameState.enemies[i].y;

            // use local coordinates when dividing by nodeSize to get bounds
            const minC = Math.max(0, Math.floor((x - gameState.area.x - radius) / nodeSize));
            const maxC = Math.min(cols - 1, Math.floor((x - gameState.area.x + radius) / nodeSize));
            const minR = Math.max(0, Math.floor((y - gameState.area.y - radius) / nodeSize));
            const maxR = Math.min(rows - 1, Math.floor((y - gameState.area.y + radius) / nodeSize));

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const node = graph[r][c];
                    if (circleOverlapsCell(x, y, radius, node.x, node.y)) {
                        blocked.add(node);
                    }
                }
            }
        }
    }

    return {rows, cols, nodeSize, testPath, updateStart};
}
