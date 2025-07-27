import * as Drawer from "./drawer.js";

export default function VelocityObs(gameState, settings) {

    const {area, player, enemies} = gameState;
    const globalTau = settings.SPT * 4;
    const margin = 2;
    const speedDivisions = 40;
    const TWOPI = 2 * Math.PI;

    // bottom top left right wall half planes of admissible velocities
    const wallHPS = [
        {nx: 0, ny: -1, rhs: () => (player.y - area.y - player.radius) / settings.SPT},
        {nx: 0, ny: 1, rhs: () => (area.y + area.height - player.y - player.radius) / settings.SPT},
        {nx: -1, ny: 0, rhs: () => (player.x - area.x - player.radius) / settings.SPT},
        {nx: 1, ny: 0, rhs: () => (area.x + area.width - player.x - player.radius) / settings.SPT}
    ];

    // test if the candidate velocity is in the region covered by the wall half planes
    function satisfyHPS(cand) {
        for (const hp of wallHPS) {
            if (hp.nx * cand.x + hp.ny * cand.y > hp.rhs()) return false;
        }
        return true;
    }

    /*
    TODO:
    maybe switch from perfect truncated cone check to approximate linear check
    pick a better escape velocity than just static angular analysis
    integrate better with a*, might require an any angle global planner
    maybe switch away from discrete sampling later...
    */

    // main function. takes in preferred heading and returns the best velocity vector
    function findSafeVelocity(heading) {
        const vos = buildAllVos(globalTau);
        if (vos === null) {console.log("null vos"); return null;}

        let color = "coral";
        if (heading === null) {
            heading = findEscapeHeading(vos);
            if (heading === null) {console.log("no escape found"); return null;}
            else color = "orchid";
        }

        const vPref = {x: heading.ux * player.maxVel, y: heading.uy * player.maxVel};
        const vPrefInBounds = satisfyHPS(vPref);
        if (!vPrefInBounds) color = "limegreen";
        Drawer.drawLine(player.x, player.y, player.x + vPref.x, player.y + vPref.y, 1, color);

        // build the set of VOs that contain vPref
        const VOsWithPref = [];
        for (let i = 0; i < vos.length; i++) {
            if (insideVO(vos[i], vPref, globalTau)) {
                VOsWithPref.push(vos[i]);
            }
        }
        // if preferred velocity is safe, just return it
        if (VOsWithPref.length === 0) {
            if (vPrefInBounds) return vPref;
            console.log("no vos but bad (outside hps) velocity"); return null;
        }
        // otherwise, find a safe velocity closest in angle to vPref (if one exists)
        return discreteSampling(vos, vPref, VOsWithPref, globalTau);
    }

    function discreteSampling(vos, vPref, VOsWithPref, tau) {
        // we iterate for every leg of every VO containing vPref,
        // for speeds starting at maxVel and subtracting increments of 1 / speedDivisions, until a safe v is found
        const candidates = [];
        for (let speedInc = speedDivisions; speedInc > 0; speedInc--) {
            for (let i = 0; i < VOsWithPref.length; i++) {
                const vo = VOsWithPref[i];
                const speed = player.maxVel * speedInc / speedDivisions;
                for (const leg of [vo.leftLeg, vo.rightLeg]) {
                    const dot = vo.apex.x * leg.x + vo.apex.y * leg.y;
                    const disc = dot*dot - (vo.apex.x*vo.apex.x + vo.apex.y*vo.apex.y - speed*speed);
                    if (disc < 0) continue;
                    const s = -dot + Math.sqrt(disc);
                    const cand = {x: vo.apex.x + leg.x * s, y: vo.apex.y + leg.y * s};

                    if (!satisfyHPS(cand)) continue;
                    let feasible = true;
                    for (const vo2 of vos) {
                        if (vo2 === vo) continue;
                        if (insideVO(vo2, cand, tau)) {
                            feasible = false;
                            break;
                        }
                    }
                    if (feasible) candidates.push(cand);
                }
            }
            if (candidates.length > 0) break;
        }

        const aPref = Math.atan2(vPref.y, vPref.x);
        let best = null;
        let bestDiff = Infinity;
        for (const cand of candidates) {
            const a = Math.atan2(cand.y, cand.x);
            const d = angularDifference(a, aPref);
            if (d < bestDiff) {
                best = cand;
                bestDiff = d;
            }
        }

        if (best === null) {
            const zero = {x: 0, y: 0};
            const zeroSafe = !vos.some(vo => insideVO(vo, zero, tau));
            if (zeroSafe) {
                best = zero;
                console.log("chose zero velocity");
            }
        }

        //if (best === null) {console.log("found no safe velocity"); return null;}
        // keep temporary 1 frame lookahead fallback, might help escape traps?
        if (tau === globalTau) {
            if (best === null) {
                const fallback = discreteSampling(vos, vPref, VOsWithPref, settings.SPT * 1);
                if (fallback === null) {console.log("found no safe velocity"); return null;}
                Drawer.drawLine(player.x, player.y, player.x + fallback.x, player.y + fallback.y, 1, "gold");
                return fallback;
            }
            Drawer.drawLine(player.x, player.y, player.x + best.x, player.y + best.y, 1, "aqua");
        }
        return best;
    }

    // this function is still scuffed. pick better method after getting base velocity selection
    // with finite-time velocity obstacles working
    function findEscapeHeading(vos) {
        if (vos === null || vos.length === 0) return null;
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
        return {ux: Math.cos(midpoint), uy: Math.sin(midpoint)};
    }

    function buildAllVos(tau) {
        const vos = [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            const relX = e.x - player.x;
            const relY = e.y - player.y;
            const dist = Math.sqrt(relX*relX + relY*relY);
            const radSum = e.radius + player.radius;

            // agent already collided with an obstacle, what are we even doing here?
            if (dist <= radSum) return null;

            // filter obstacles that can't collide within time tau even at max opposing velocity
            const velStep = (player.maxVel + Math.sqrt(e.vx*e.vx + e.vy*e.vy)) * tau;
            if (dist - radSum > velStep) continue;

            if (settings.drawVo) Drawer.drawCircle(e.x, e.y, e.radius / 4, 2, "blue");
            vos.push(computeVo(e, relX, relY, dist, radSum));
        }
        return vos;
    }

    function computeVo(enemy, relX, relY, dist, radSum) {
        // the filter works on pure radii sum, no safety margin. now we add the margin so that VO plans around those.
        // if the agent is close enough to the obstacle that adding the margin would look like they already collided,
        // then we fall back to without the margin, which is guaranteed to not have collided. this all guarantees that
        // alpha = Math.asin(radiusSum / dist) is not undefined.
        let newRadSum = radSum + margin;
        if (dist <= newRadSum) newRadSum = radSum;

        const alpha = Math.asin(newRadSum / dist);
        const angleToEnemy = Math.atan2(relY, relX);
        const leftAng = angleToEnemy + alpha;
        const rightAng = angleToEnemy - alpha;
    
        const leftLeg = {x: Math.cos(leftAng), y: Math.sin(leftAng)};
        const rightLeg = {x: Math.cos(rightAng), y: Math.sin(rightAng)};
        const apex = {x: enemy.vx, y: enemy.vy};
        return {apex, leftLeg, rightLeg, relX, relY, rad: newRadSum};
    }

    function insideVO(vo, vPref, tau) {
        // compute relative velocity vector (treat obstacle as static)
        const dvx = vPref.x - vo.apex.x;
        const dvy = vPref.y - vo.apex.y;

        // angle test (infinite cone)
        const crossRight = vo.rightLeg.x * dvy - vo.rightLeg.y * dvx;
        const crossLeft = vo.leftLeg.x * dvy - vo.leftLeg.y * dvx;
        const inCone = crossRight >= 0 && crossLeft <= 0;
        if (!inCone) return false;

        // finite horizon time test
        const a = dvx*dvx + dvy*dvy;
        if (a === 0) return false;
        const b = -2*(vo.relX*dvx + vo.relY*dvy);
        const c = (vo.relX*vo.relX + vo.relY*vo.relY) - vo.rad*vo.rad;
        const disc = b*b - 4*a*c;
        if (disc < 0) return false;
        const sqrtDisc = Math.sqrt(disc);

        const t1 = (-b - sqrtDisc) / (2*a);
        const t2 = (-b + sqrtDisc) / (2*a);
        const tEntry = (t1 >= 0) ? t1 : t2;
        return tEntry >= 0 && tEntry <= tau;
    }

    function angularDifference(a, b) {
        const d = Math.abs(a - b) % TWOPI;
        return d > Math.PI ? TWOPI - d : d;
    }

    return {findSafeVelocity};

}


    /*
    // velocities on cone bounds are considered safe
    function strictlyInsideVO(vo, prefVel) {
        const dvx = prefVel.vx - vo.apex.x;
        const dvy = prefVel.vy - vo.apex.y;
        const crossRight = vo.rightLeg.x * dvy - vo.rightLeg.y * dvx;
        const crossLeft = vo.leftLeg.x * dvy - vo.leftLeg.y * dvx;
        return crossRight > 0 && crossLeft < 0;
    }
    */