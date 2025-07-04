import Heap from "./heap-js.es5.js";
import * as Drawer from "./drawer.js"

export default function TAS(gameState, settings) {

    const enemyBuffer = gameState.player.radius + 6;
    const nodeSize = gameState.area.nodeSize;
    const halfSize = nodeSize / 2;
    const diagSize = nodeSize * Math.SQRT2;
    const areaWidth = gameState.area.width;
    const areaHeight = gameState.area.height;
    const cols = Math.ceil(areaWidth / nodeSize);
    const rows = Math.ceil(areaHeight / nodeSize);
    const graph = [];
    console.log(rows, cols, rows * cols);

    //let nodeId = 0;
    for (let r = 0; r < rows; r++) {
        graph[r] = [];
        for (let c = 0; c < cols; c++) {
            graph[r][c] = {
                x: c * nodeSize + halfSize + gameState.area.x,
                y: r * nodeSize + halfSize + gameState.area.y,
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
                }
                //else {
                //    u.neighbors.push(null);
                //}
            }
        }
    }

    let startNode = nodeFromPos(80, gameState.area.y + areaHeight / 2);
    let goalNode = nodeFromPos(areaWidth - 80, gameState.area.y + areaHeight / 2);
    const comparator = (a, b) => a.f - b.f;
    const openHeap = new Heap(comparator);
    const closedSet = new Set();
    const blockedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const prevs = new Map();

    function astar() {
        if (startNode === goalNode) {
            console.log("reached goal");
            return null;
        }

        openHeap.clear();
        closedSet.clear();
        blockedSet.clear();
        gScore.clear();
        fScore.clear();
        prevs.clear();
        detectEnemyChanges(blockedSet);

        gScore.set(startNode, 0);
        fScore.set(startNode, heuristic(startNode));
        openHeap.push({node: startNode, f: fScore.get(startNode)});

        let best = startNode;
        let bestH = heuristic(startNode);
        let expansions = 0;

        while (!openHeap.isEmpty()) {
            expansions++;
            const {node: current, f} = openHeap.pop();
            if (f > fScore.get(current)) {
                continue;
            }
            if (current === goalNode) {
                return reconstructPath(prevs, current, expansions);
            }

            const currH = heuristic(current);
            if (currH < bestH) {
                best = current;
                bestH = currH;
            }

            closedSet.add(current);
            for (const {node: neighbor, cost} of current.neighbors) {
                if (closedSet.has(neighbor) || blockedSet.has(neighbor)) {
                    continue;
                }
                const tentativeG = gScore.get(current) + cost;
                if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
                    prevs.set(neighbor, current);
                    gScore.set(neighbor, tentativeG);
                    fScore.set(neighbor, tentativeG + heuristic(neighbor));
                    openHeap.push({node: neighbor, f: fScore.get(neighbor)});
                }
            }
        }
        if (best === startNode) {
            console.log("returning no path");
        } else {
            console.log("returning partial path");
        }
        return reconstructPath(prevs, best, expansions);
    }

    function reconstructPath(prevs, curr, expansions) {
        //console.log(expansions);
        const path = [curr];
        while (prevs.has(curr)) {
            curr = prevs.get(curr);
            path.push(curr);
        }
        return path.reverse();
    }

    function testPath() {
        Drawer.drawArea(gameState.area, settings.showGrid);
        let path = astar();
        if (path !== null && path.length > 1) {
            //Drawer.fillNodes(path, halfSize, "blue");
            Drawer.fillNode(path[0], halfSize, "red");
            Drawer.fillNode(path[path.length - 1], halfSize, "green");
            Drawer.drawPathLine(path, "blue");
            startNode = path[1];
            return startNode;
        }
        //Drawer.drawSquare(startNode.x, startNode.y, halfSize, "red");
        //Drawer.drawSquare(goalNode.x, goalNode.y, halfSize, "lightgreen");
        return null;
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

    return {rows, cols, testPath};
}
