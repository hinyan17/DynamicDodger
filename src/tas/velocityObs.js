import { Vector } from "../utils.js";

export default function VelocityObs(gameState, drawer) {

    const {settings, area, player, enemies} = gameState;
    const globalTau = settings.SPT * 4;
    const margin = 2;
    const speedDivisions = 40;
    const TWOPI = 2 * Math.PI;

    // bottom top left right wall half planes of admissible velocities
    const wallHPS = [
        {nx: 0, ny: -1, rhs: () => (player.pos.y - area.y - player.radius) / settings.SPT},
        {nx: 0, ny: 1, rhs: () => (area.y + area.height - player.pos.y - player.radius) / settings.SPT},
        {nx: -1, ny: 0, rhs: () => (player.pos.x - area.x - player.radius) / settings.SPT},
        {nx: 1, ny: 0, rhs: () => (area.x + area.width - player.pos.x - player.radius) / settings.SPT}
    ];

    // test if the candidate velocity is in the region covered by the wall half planes
    function satisfyHPS(cand) {
        for (const hp of wallHPS) {
            if (hp.nx * cand.x + hp.ny * cand.y > hp.rhs()) return false;
        }
        return true;
    }

    function angularDifference(a, b) {
        const d = Math.abs(a - b) % TWOPI;
        return d > Math.PI ? TWOPI - d : d;
    }

    /*
    TODO:
    maybe switch from perfect truncated cone check to approximate linear check
    pick a better escape velocity than just static angular analysis
    maybe switch away from discrete sampling later...
    */

    // main function. takes in intent vector and returns the best velocity vector
    function findSafeVelocity(intentVec) {
        if (!intentVec) return null;

        const vos = buildAllVos(globalTau);
        //if (!vos) return null;

        const vPref = new Vector(intentVec.x * player.maxSpeed, intentVec.y * player.maxSpeed);
        const vPrefInBounds = satisfyHPS(vPref);
        //console.log(vos, vPref, vPrefInBounds);
        const color = vPrefInBounds ? "coral" : "limegreen";
        drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + vPref.x, player.pos.y + vPref.y, 1, color);

        // build the set of VOs that contain vPref
        const vosWithPref = [];
        for (let i = 0; i < vos.length; i++) {
            if (insideVO(vos[i], vPref, globalTau)) {
                vosWithPref.push(vos[i]);
            }
        }

        ///*
        // if preferred velocity is safe, just return the original intent vector
        if (vosWithPref.length === 0) {
            if (vPrefInBounds || vos.length === 0) {
                return intentVec;
            }
            console.log("vos exist, vosWithPref is 0, but vPref out of bounds. must pick new safe vel");
        }
        // otherwise, find a safe velocity closest in angle to vPref, if one exists
        const vSafe = discreteSampling(vos, vPref, vosWithPref, globalTau);

        // return a corrected intent vector, NOT A VELOCITY
        if (vSafe !== null) {
            vSafe.scale(1 / player.maxSpeed);
        }
        return vSafe;
        //*/
        //return intentVec;
    }

    function discreteSampling(vos, vPref, vosWithPref, tau) {
        // iterate for every leg of every VO containing vPref,
        // for speeds starting at maxSpeed and subtracting increments of 1 / speedDivisions, until a safe v is found
        const candidates = [];
        for (let speedInc = speedDivisions; speedInc > 0; speedInc--) {
            for (let i = 0; i < vosWithPref.length; i++) {
                const vo = vosWithPref[i];
                const speed = player.maxSpeed * speedInc / speedDivisions;
                for (const leg of [vo.leftLeg, vo.rightLeg]) {
                    const dot = vo.apex.x * leg.x + vo.apex.y * leg.y;
                    const disc = dot*dot - (vo.apex.x*vo.apex.x + vo.apex.y*vo.apex.y - speed*speed);
                    if (disc < 0) continue;
                    const s = -dot + Math.sqrt(disc);
                    const cand = new Vector(vo.apex.x + leg.x * s, vo.apex.y + leg.y * s);

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
            const zero = new Vector(0, 0);
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
                const fallback = discreteSampling(vos, vPref, vosWithPref, settings.SPT * 1);
                if (fallback === null) {
                    console.log("found no safe velocity");
                } else {
                    drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + fallback.x, player.pos.y + fallback.y, 1, "gold");
                }
                return fallback;
            }
            drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + best.x, player.pos.y + best.y, 1, "aqua");
        }
        return best;
    }

    // this is still scuffed. pick better method after getting base velocity selection with finite-time velocity obstacles working
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
            const relPos = new Vector(e.pos.x - player.pos.x, e.pos.y - player.pos.y);
            const dist = relPos.magnitude();
            const radSum = e.radius + player.radius;

            // filter obstacles that can't collide within time tau even at max opposing velocity
            const velStep = (player.maxSpeed + e.vel.magnitude()) * tau;
            if (dist - radSum > velStep) continue;

            if (settings.drawVo) {
                drawer.queueDrawCircle(e.pos.x, e.pos.y, e.radius / 4, 2, "blue");
            }
            vos.push(computeVo(e, relPos, dist, radSum));
        }
        return vos;
    }

    function computeVo(enemy, relPos, dist, radSum) {
        // add the safety margin
        let voRadius = radSum + margin;
        if (dist <= radSum) {
            // if the player is in an enemy, panic
            voRadius = dist * 0.999;
        } else if (dist <= voRadius) {
            // if the player isn't touching the enemy, but is in the safety margin, ignore the margin
            voRadius = radSum;
        }

        const alpha = Math.asin(Math.min(1, voRadius / dist));
        const angleToEnemy = Math.atan2(relPos.y, relPos.x);
        const leftAng = angleToEnemy + alpha;
        const rightAng = angleToEnemy - alpha;
    
        const leftLeg = new Vector(Math.cos(leftAng), Math.sin(leftAng));
        const rightLeg = new Vector(Math.cos(rightAng), Math.sin(rightAng));
        const apex = new Vector(enemy.vel.x, enemy.vel.y);
        return {apex, leftLeg, rightLeg, relPos, rad: voRadius};
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
        const b = -2*(vo.relPos.x*dvx + vo.relPos.y*dvy);
        const c = (vo.relPos.x*vo.relPos.x + vo.relPos.y*vo.relPos.y) - vo.rad*vo.rad;
        const disc = b*b - 4*a*c;
        if (disc < 0) return false;
        const sqrtDisc = Math.sqrt(disc);

        const t1 = (-b - sqrtDisc) / (2*a);
        const t2 = (-b + sqrtDisc) / (2*a);
        const tEntry = (t1 >= 0) ? t1 : t2;
        return tEntry >= 0 && tEntry <= tau;
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