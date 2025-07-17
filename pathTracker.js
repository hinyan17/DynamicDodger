import * as Drawer from "./drawer.js";

export default function PathTracker(gameState) {

    const {player, enemies} = gameState;

    // implements pure pursuit with unconstrained kinodynamics
    function computeDesiredVelocity(path, dt, goalNode) {
        if (path === null) return {vx: 0, vy: 0};
        //if (path.length === 1) return computeEscapeVelocity(goalNode);
        if (path.length === 1) return null;

        const lookahead = Math.round(player.maxVel * dt * 1.5);
        const lookahead2 = lookahead * lookahead;
        Drawer.drawCircle(player.x, player.y, lookahead, 1, "orange");

        for (let i = 0; i < path.length - 1; i++) {
            const A = path[i], B = path[i + 1];
            const ax = A.x - player.x, ay = A.y - player.y;
            const bx = B.x - player.x, by = B.y - player.y;
            const dx = bx - ax, dy = by - ay;
            const a = dx*dx + dy*dy;
            const b = 2*(ax*dx + ay*dy);
            const c = ax*ax + ay*ay - lookahead2;
            const disc = b*b - 4*a*c;
            if (disc < 0) continue;
            const sqrtDisc = Math.sqrt(disc);

            const t1 = (-b - sqrtDisc) / (2*a);
            const t2 = (-b + sqrtDisc) / (2*a);
            const sols = [t1, t2].filter(t => t >= 0 && t <= 1);
            if (sols.length > 0) {
                const latest = Math.max(...sols);
                const distX = A.x + latest*(B.x - A.x) - player.x;
                const distY = A.y + latest*(B.y - A.y) - player.y;
                const dist = Math.sqrt(distX*distX + distY*distY) || 1;
                return {
                    vx: (distX / dist) * player.maxVel,
                    vy: (distY / dist) * player.maxVel
                };
            }
        }

        // fallback in case the entire path is inside the lookahead circle (will probably never happen)
        const pathEnd = path[path.length - 1];
        const dx = pathEnd.x - player.x;
        const dy = pathEnd.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        // if pathEnd is within stepping distance, return the vel needed to arrive there in one frame
        if (dist < player.maxVel * dt) {
            return {vx: dx / dt, vy: dy / dt};
        }
        // if pathEnd is not within stepping distance, then aim directly at it
        return {
            vx: (dx / dist) * player.maxVel,
            vy: (dy / dist) * player.maxVel
        };
    }

    // fallback when the path contains only the start node, meaning that the global planner is stuck
    // change this to be safer: opposite of average enemy bearing
    function computeEscapeVelocity(goalNode) {
        console.log("computing escape velocity");
        const dx = goalNode.x - player.x;
        const dy = goalNode.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        return {
            vx: (dx / dist) * player.maxVel,
            vy: (dy / dist) * player.maxVel
        }
    }

    return {computeDesiredVelocity};
}
