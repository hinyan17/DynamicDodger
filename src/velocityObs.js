import * as Drawer from "./drawer.js";

export default function VelocityObs(gameState, settings) {

    const {player, enemies} = gameState;
    const tau = settings.SPT * 4;
    const margin = 2.5;

    // main function. takes in preferred heading and returns the best velocity vector
    function findSafeVelocity(heading) {
        const merged = buildAngularUnion();
        if (merged === null) return null;

        // separation of concerns: find best angle first, then best magnitude of speed
        const safeAng = heading === null ? findEscapeAngle(merged) : findSafeAngle(merged, heading);
        if (safeAng === null) return null;
        return findMaxSafeSpeed(safeAng);
    }

    // returns an array of angular intervals forming the union of VO cones at the ORIGIN
    function buildAngularUnion() {
        const vos = buildAllVOS();
        if (vos === null || vos.length === 0) return null;

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
                intervals.push({start: bound2, end: bound1, vo});
            } else {
                intervals.push({start: bound2, end: TWOPI, vo}, {start: 0, end: bound1, vo});
            }
        }

        // sort and merge angles
        intervals.sort((a, b) => a.start - b.start);
        const merged = [{start: intervals[0].start, end: intervals[0].end, vos: [intervals[0].vo]}];
        for (let i = 1; i < intervals.length; i++) {
            const {start, end, vo} = intervals[i];
            const last = merged[merged.length - 1];
            if (start <= last.end) {
                last.end = Math.max(last.end, end);
                last.vos.push(vo);
            } else {
                merged.push({start, end, vo});
            }
        }
        return merged;
    }

    function findSafeAngle(merged, heading) {
        if (merged === null) return null;
        if (heading === null) // do some thing

        // sortedMerged: a sorted list of intervals (and their vos) to consider
        // for escape angle, rank by larger gap size
        // for closest safe angle, rank by smaller angular difference to heading
        // iterate over candidate intervals. if all velocities are blocked for a candidate, move to next
    }

    // returns the unit vector of the escape angle
    function findEscapeAngle(merged) {
        if (merged === null) return null;

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
        if (bestGap === -Infinity) return null;

        const midpoint = (bestStart + bestGap / 2) % TWOPI;
        const mdptVec = {ux: Math.cos(midpoint), uy: Math.sin(midpoint)};
        if (settings.drawVO) {
            Drawer.drawLine(player.x, player.y, player.x + mdptVec.ux * player.maxVel, player.y + mdptVec.uy * player.maxVel, 1, "indigo");
        }
        return mdptVec;
    }

    // returns the unit vector of the closest safe angle
    function findClosestSafeAngle(merged, heading) {
        if (merged === null) return null;
        if (heading === null) heading = findEscapeAngle(merged);
        if (settings.drawVO) {
            Drawer.drawLine(player.x, player.y, player.x + heading.ux * player.maxSpeed, player.y + heading.uy * player.maxSpeed, 1, "coral");
        }

        let newHeading = heading;
        const angle = Math.atan2(heading.uy, heading.ux);
        // linear pass over all unsafe regions. if the angle is in one, then the closest safe angle must be one of its legs
        for (const [start, end] of merged) {
            if (start <= angle && angle < end) {
                const dToStart = angularDifference(start, angle);
                const dToEnd = angularDifference(angle, end);
                const closest = dToStart < dToEnd ? start : end;
                newHeading = {ux: Math.cos(closest), uy: Math.sin(closest)};
                break;
            }
        }

        if (settings.drawVO && newHeading !== heading) {
            Drawer.drawLine(player.x, player.y, player.x + newHeading.ux * player.maxSpeed, player.y + newHeading.uy * player.maxSpeed, 1, "aqua");
        }
        return newHeading;
    }

    function findMaxSafeSpeed(apex, theta) {
        let low = 0;
        let high = player.maxVel;
        for (let i = 0; i < 6; i++) {
            const mid = (low + high) / 2;
            const vx = apex.vx + Math.cos(theta) * mid;
            const vy = apex.vy + Math.sin(theta) * mid;
            if (vos.some(vo => strictlyInsideVO(vo, {vx, vy}))) {
                high = mid;
            } else {
                low = mid;
            }
        }
        return low;
    }

    function angularDifference(a, b) {
        const d = Math.abs(a - b) % (2*Math.PI);
        return d > Math.PI ? (2*Math.PI) - d : d;
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

            if (settings.drawVO) Drawer.drawCircle(e.x, e.y, e.radius / 4, 2, "blue");
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

    function legBlockedByVO(vo, cx, cy) {
        // pure angle tests: is (cx,cy) in the closed cone of vo?
        const crossRight = vo.rightLeg.x * cy - vo.rightLeg.y * cx;
        const crossLeft = vo.leftLeg.x * cy - vo.leftLeg.y * cx;
        return crossRight >= 0 && crossLeft <= 0;
    }

    // velocities on cone bounds are considered safe
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
        // only speeds outside this disk can collide within tau
        //const relSpeed = vo.radiusSum / tau;
        //return (dvx*dvx + dvy*dvy) <= relSpeed*relSpeed;
    }

    return {findSafeVelocity};

}
