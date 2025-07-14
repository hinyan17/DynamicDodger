import FastPriorityQueue from "./fpq/FastPriorityQueue.js";
import * as Drawer from "./drawer.js"

export default function TAS(gameState, settings) {

    const {area, player, enemies} = gameState;
    const enemyBuffer = player.radius + 5;
    const areaWidth = area.width;
    const areaHeight = area.height;
    const cols = area.cols;
    const rows = area.rows;
    const nodeSize = area.nodeSize;
    const halfSize = nodeSize / 2;
    const diagSize = nodeSize * Math.SQRT2;
    const graph = [];

    //const pblocked = new Set();
    for (let r = 0; r < rows; r++) {
        graph[r] = [];
        for (let c = 0; c < cols; c++) {
            const x = c * nodeSize + halfSize + area.x;
            const y = r * nodeSize + halfSize + area.y;
            const inBounds = (
                x - player.radius >= area.x &&
                x + player.radius < area.x + areaWidth &&
                y - player.radius >= area.y &&
                y + player.radius < area.y + areaHeight
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

    // agent's field of view radius squared
    const horizon2 = (nodeSize * 40)**2;
    let currentRunId = -1;
    let startNode = nodeFromPos(area.leftSafeX / 2, area.y + areaHeight / 2);
    let goalNode = nodeFromPos(area.rightSafeX + (area.leftSafeX / 2), area.y + areaHeight / 2);
    //const comparator = (a, b) => a.f - b.f;
    /*
    const comparator = (a, b) => {
        if (a.f !== b.f) {
            return a.f - b.f;
        }
        return b.node.g - a.node.g;
    };
    */
    const comparator = (a, b) => a.f < b.f || (a.f === b.f && a.node.g > b.node.g);
    const open = new FastPriorityQueue(comparator);
    const blockedSet = new Set();
    // g, f, prev, and closed are now built into the graph with runId

    function astar() {
        if (startNode === goalNode) return null;

        currentRunId++;
        open.removeMany();
        detectEnemyChanges();

        lazyInit(startNode);
        startNode.g = 0;
        startNode.f = heuristic(startNode);
        open.add({node: startNode, f: startNode.f});

        let best = startNode;
        let bestH = heuristic(startNode);
        //let expansions = 0;

        while (!open.isEmpty()) {
            //expansions++;
            const {node: current, f} = open.poll();
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
                if (dx*dx + dy*dy > horizon2) continue;

                const tentativeG = current.g + cost;
                if (tentativeG < nbr.g) {
                    nbr.g = tentativeG;
                    nbr.f = tentativeG + heuristic(nbr);
                    nbr.prev = current;
                    open.add({node: nbr, f: nbr.f});
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
        Drawer.drawArea(area, settings.showGrid);
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
        startNode = nodeFromPos(player.x, player.y);
    }

    function heuristic(node) {
        const dx = node.x - goalNode.x;
        const dy = node.y - goalNode.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    function nodeFromPos(x, y) {
        const lx = x - area.x;
        const ly = y - area.y;
        if (lx < 0 || ly < 0 || lx >= areaWidth || ly >= areaHeight) {
            throw new Error("Out of bounds");
        }
        return graph[Math.floor(ly / nodeSize)][Math.floor(lx / nodeSize)];
    }

    function detectEnemyChanges() {
        blockedSet.clear();
        for (let i = 0; i < enemies.length; i++) {
            const x = enemies[i].x;
            const y = enemies[i].y;

            // reject all enemies outside of a* horizon
            const dx = x - player.x;
            const dy = y - player.y;
            if (dx*dx + dy*dy > horizon2) continue;

            const rad = enemies[i].radius + enemyBuffer;
            const rad2 = rad * rad;

            // calculate bounding top and bottom (rows) for each enemy
            // localize coordinates when dividing by nodeSize to get indexes
            const minR = Math.max(0, Math.floor((y - area.y - rad) / nodeSize));
            const maxR = Math.min(rows - 1, Math.floor((y - area.y + rad) / nodeSize));

            // for every bounded row calculate bounding cols to block
            for (let r = minR; r <= maxR; r++) {
                const distY = Math.max(0, Math.abs(graph[r][0].y - y) - halfSize);
                const span = Math.sqrt(rad2 - distY*distY);
                const leftX = x - span;
                const rightX = x + span;
                const minC = Math.max(0, Math.floor((leftX - area.x) / nodeSize));
                const maxC = Math.min(cols - 1, Math.floor((rightX - area.x) / nodeSize));
                for (let c = minC; c <= maxC; c++) {
                    const node = graph[r][c];
                    blockedSet.add(node);
                    //Drawer.fillNode(node, halfSize, "lightpink");
                }
            }
            //Drawer.drawCircle(x, y, rad, 1, "red");
        }
    }

    return {testPath, updateStart};
}
