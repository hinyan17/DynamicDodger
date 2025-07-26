import * as Drawer from "./drawer.js";

export default function PathTracker(gameState) {

    const {player} = gameState;

    // implements pure pursuit with unconstrained kinematics
    function computeDesiredHeading(path, dt) {
        if (path === null) return null;
        if (path.length === 1) return null;
        //if (path.length <= 4) return null;
        //if (path.length === 1) return escapeHeading(goalNode);

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
            if (sols.length === 0) continue;

            const latest = Math.max(...sols);
            const distX = A.x + latest*(B.x - A.x) - player.x;
            const distY = A.y + latest*(B.y - A.y) - player.y;
            const mag = Math.sqrt(distX*distX + distY*distY);
            if (mag === 0) return null;
            return {ux: distX / mag, uy: distY / mag};
        }

        // fallback in case the entire path is inside the lookahead circle (will rarely happen)
        const pathEnd = path[path.length - 1];
        const dx = pathEnd.x - player.x;
        const dy = pathEnd.y - player.y;
        const mag = Math.sqrt(dx*dx + dy*dy);
        if (mag === 0) return null;
        return {ux: dx / mag, uy: dy / mag};
    }

    // aim directly at goalNode, used as a test of VO without a global path
    function noPathHeading(goalNode) {
        const dx = goalNode.x - player.x;
        const dy = goalNode.y - player.y;
        const mag = Math.sqrt(dx*dx + dy*dy);
        if (mag === 0) return null;
        return {ux: dx / mag, uy: dy / mag}
    }

    return {computeDesiredHeading, noPathHeading};
}
