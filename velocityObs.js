import * as Drawer from "./drawer.js";

export default function VelocityObs(gameState, settings) {

    const {player, enemies} = gameState;
    const tau = settings.SPT * 4;
    const margin = 5;

    function findSafeVelocity(prefVel) {
        const vos = buildAllVOS();
        if (vos === null) return null;

        //console.log(vos);
        for (let v of vos) {
            Drawer.drawVO(v, player);
        }
        /*
        const safe = true;
        for (let i = 0; i < vos.length; i++) {
            if (insideVO(vos[i], prefVal)) {
                safe = false;
                break;
            }
        }
        if (safe) return prefVel;
        */
        // solve some linear program for the best velocity?
    }

    function buildAllVOS() {
        const vos = [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const relX = e.x - player.x;
            const relY = e.y - player.y;
            const dist = Math.sqrt(relX*relX + relY*relY);
            let radiusSum = e.radius + player.radius;

            // already collided with an obstacle, what are we even doing here?
            if (dist <= radiusSum) return null;

            radiusSum += margin;
            // if agent and obstacle both ran full speed directly toward each other
            // and still can't collide within time tau, don't bother building its VO
            const velStep = (player.maxVel + Math.sqrt(e.vx*e.vx + e.vy*e.vy)) * tau;
            if (dist - radiusSum > velStep) continue;

            Drawer.drawCircle(e.x, e.y, e.radius / 4, 2, "blue");
            vos.push(computeVO(e, relX, relY, dist, radiusSum));
        }
        return vos;
    }

    function computeVO(enemy, relX, relY, dist, radiusSum) {
        const angleToEnemy = Math.atan2(relY, relX);
        const alpha = Math.asin(radiusSum / dist);

        const leftAng = angleToEnemy + alpha;
        const rightAng = angleToEnemy - alpha;

        const apex = {x: enemy.vx, y: enemy.vy};
        const leftLeg = {x: Math.cos(leftAng), y: Math.sin(leftAng)};
        const rightLeg = {x: Math.cos(rightAng), y: Math.sin(rightAng)};
        return {enemy, apex, leftLeg, rightLeg};
    }

    function insideVO(vo, prefVel) {
        // compute relative velocity vector from vo apex to prefVel
        const dvx = prefVel.vx - vo.apex.x;
        const dvy = prefVel.vy - vo.apex.y;

        // cross (rightLeg, v) >= 0: v is CCW of rightLeg
        const crossRight = vo.rightLeg.x * dvy - vo.rightLeg.y * dvx;
        // cross (leftLeg, v) <= 0: v is CW of leftLeg
        const crossLeft = vo.leftLeg.x * dvy - vo.leftLeg.y * dvx;

        // if both hold, v sits inside the infinite cone
        return crossRight >= 0 && crossLeft <= 0;
    }

    return {findSafeVelocity};

}
