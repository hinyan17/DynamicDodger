import * as Drawer from "./drawer.js";

export default function VelocityObs(gameState, settings) {

    const {player, enemies} = gameState;
    const tau = settings.SPT * 4;
    const margin = 2.5;

    function findEscapeVelocity() {
        const vos = buildAllVOS();
        if (vos === null) return null;

        const TWOPI = 2 * Math.PI;
        const intervals = [];
        for (let i = 0; i < vos.length; i++) {
            const vo = vos[i];
            let bound1 = (Math.atan2(vo.leftLeg.y, vo.leftLeg.x) + TWOPI) % TWOPI;
            let bound2 = (Math.atan2(vo.rightLeg.y, vo.rightLeg.x) + TWOPI) % TWOPI;
            const diff = (bound1 - bound2 + TWOPI) % TWOPI;
            if (diff > Math.PI) {
                [bound1, bound2] = [bound2, bound1];
            }
            if (bound2 <= bound1) {
                intervals.push([bound2, bound1]);
            } else {
                intervals.push([bound2, TWOPI], [0, bound1]);
            }
        }

        if (intervals.length === 0) return null;

        // sort and merge angles
        intervals.sort((u, v) => u[0] - v[0]);
        const merged = [intervals[0].slice()];
        for (let i = 1; i < intervals.length; i++) {
            const [start, end] = intervals[i];
            const last = merged[merged.length - 1];
            if (start <= last[1]) {
                last[1] = Math.max(last[1], end);
            } else {
                merged.push([start, end]);
            }
        }

        // find biggest gap
        let bestGap = -Infinity;
        let bestStart = 0;
        for (let i = 0; i < merged.length; i++) {
            const end = merged[i][1];
            const nextStart = (i === merged.length - 1) ? merged[0][0] + TWOPI : merged[i+1][0];
            const gap = nextStart - end;
            if (gap > bestGap) {
                bestGap = gap;
                bestStart = end;
            }
        }

        // union of VO cones fully covered, nowhere to go
        if (bestGap <= 0) return null;

        const midpoint = (bestStart + bestGap / 2) % TWOPI;
        const mdptVector = {
            vx: Math.cos(midpoint) * player.maxVel,
            vy: Math.sin(midpoint) * player.maxVel
        };
        Drawer.drawLine(player.x, player.y, player.x + mdptVector.vx, player.y + mdptVector.vy, 1, "indigo");
        return mdptVector;
    }

    function findClosestSafeVelocity(prefVel) {
        if (prefVel === null) return findEscapeVelocity();
        Drawer.drawLine(player.x, player.y, player.x + prefVel.vx, player.y + prefVel.vy, 1, "coral");
        const vos = buildAllVOS();
        if (vos === null) return null;

        // if prefVel is safe, just return it
        let safe = true;
        for (let i = 0; i < vos.length; i++) {
            if (insideVO(vos[i], prefVel)) {
                safe = false;
                break;
            }
        }
        if (safe) return prefVel;

        // if not, then find a safe velocity closest in angle to prefVel, if one exists
        const speed = Math.sqrt(prefVel.vx*prefVel.vx + prefVel.vy*prefVel.vy);
        const prefAngle = Math.atan2(prefVel.vy, prefVel.vx);
        const candidates = [];
        for (let i = 0; i < vos.length; i++) {
            const vo = vos[i];
            if (!insideVO(vo, prefVel)) continue;
            for (const leg of [vo.leftLeg, vo.rightLeg]) {
                const cand = {
                    vx: vo.apex.x + leg.x * speed,
                    vy: vo.apex.y + leg.y * speed
                };

                let feasible = true;
                for (const vo2 of vos) {
                    if (strictlyInsideVO(vo2, cand)) {
                        feasible = false;
                        break;
                    }
                }
                if (feasible) candidates.push(cand);
            }
        }
        const zero = {vx: 0, vy: 0};
        const zeroUnsafe = vos.some(vo => strictlyInsideVO(vo, zero));
        if (!zeroUnsafe) candidates.push(zero);

        //const safeCands = candidates.filter(v => !vos.some(vo => strictlyInsideVO(vo, v)));
        let best = null;
        let bestDiff = Infinity;
        for (const cand of candidates) {
            const a = Math.atan2(cand.vy, cand.vx);
            const d = angularDifference(a, prefAngle);
            if (d < bestDiff) {
                best = cand;
                bestDiff = d;
            }
        }

        if (best === null) return null;
        Drawer.drawLine(player.x, player.y, player.x + best.vx, player.y + best.vy, 1, "aqua");
        return best;
    }

    function angularDifference(a, b) {
        let d = (a - b) % (2*Math.PI);
        if (d >  Math.PI) d -= 2*Math.PI;
        if (d < -Math.PI) d += 2*Math.PI;
        return Math.abs(d);
    }

    function buildAllVOS() {
        const vos = [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const relX = e.x - player.x;
            const relY = e.y - player.y;
            const dist = Math.sqrt(relX*relX + relY*relY);
            const radiusSum = e.radius + player.radius;

            // agent already collided with an obstacle, what are we even doing here?
            if (dist <= radiusSum) return null;

            // filter obstacles that can't collide within time tau even at max opposing velocity
            const velStep = (player.maxVel + Math.sqrt(e.vx*e.vx + e.vy*e.vy)) * tau;
            if (dist - radiusSum > velStep) continue;

            Drawer.drawCircle(e.x, e.y, e.radius / 4, 2, "blue");
            vos.push(computeVO(e, relX, relY, dist, radiusSum));
        }
        return vos;
    }

    function computeVO(enemy, relX, relY, dist, radiusSum) {
        // the filter works on pure radii sum, no safety margin. now we add the margin so that VO plans around those.
        // if the agent is close enough to the obstacle that adding the margin would look like they already collided,
        // then we fall back to without the margin, which is guaranteed to not have collided. this all guarantees that
        // alpha = Math.asin(radiusSum / dist) is not undefined.
        let newRadSum = radiusSum + margin;
        if (dist <= newRadSum) {
            newRadSum = radiusSum;
        }

        const alpha = Math.asin(newRadSum / dist);
        //const alpha = Math.asin(Math.min(radiusSum + margin, dist) / dist);       //works with small margin only
        const angleToEnemy = Math.atan2(relY, relX);

        const leftAng = angleToEnemy + alpha;
        const rightAng = angleToEnemy - alpha;

        const apex = {x: enemy.vx, y: enemy.vy};
        const leftLeg = {x: Math.cos(leftAng), y: Math.sin(leftAng)};
        const rightLeg = {x: Math.cos(rightAng), y: Math.sin(rightAng)};
        return {apex, leftLeg, rightLeg};
    }

    function strictlyInsideVO(vo, prefVel) {
        const dvx = prefVel.vx - vo.apex.x;
        const dvy = prefVel.vy - vo.apex.y;
        const crossRight = vo.rightLeg.x * dvy - vo.rightLeg.y * dvx;
        const crossLeft = vo.leftLeg.x * dvy - vo.leftLeg.y * dvx;
        return crossRight > 0 && crossLeft < 0;
    }

    function insideVO(vo, prefVel) {
        // compute relative velocity vector from vo apex to prefVel
        const dvx = prefVel.vx - vo.apex.x;
        const dvy = prefVel.vy - vo.apex.y;

        // angle test (infinite cone)
        const crossRight = vo.rightLeg.x * dvy - vo.rightLeg.y * dvx;
        const crossLeft = vo.leftLeg.x * dvy - vo.leftLeg.y * dvx;
        return crossRight >= 0 && crossLeft <= 0;

        //if (!(crossRight >= 0 && crossLeft <= 0)) return false;
        // magnitude test (finite horizon), throw out too small vels that can't collide
        // only speeds inside this disk can collide within tau
        //const relSpeed = vo.radiusSum / tau;
        //return (dvx*dvx + dvy*dvy) <= relSpeed*relSpeed;
    }

    return {findClosestSafeVelocity};

}
