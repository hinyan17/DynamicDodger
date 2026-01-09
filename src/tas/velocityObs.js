import { Vector, angularDifference } from "../utils.js";

export default function VelocityObs(gameState, settings, drawer) {

    const {area, player, enemies} = gameState;
    const globalTau = settings.SPT * 3;
    const margin = 3;
    const speedDivisions = 50;

    /*
    todo list:
    maybe switch from perfect truncated cone check to approximate linear check
    maybe switch away from discrete sampling later...
    */

    function drawVos(vos, vosWithPref, vPref, vPrefInBounds) {
        let color = vPrefInBounds ? "coral" : "limegreen";
        drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + vPref.x, player.pos.y + vPref.y, 1, color);

        for (const vo of vos) {
            color = vosWithPref.includes(vo) ? "gold" : "blue";
            drawer.queueDrawCircle(vo.enemy.pos.x, vo.enemy.pos.y, vo.enemy.radius / 4, 2, color);
            drawer.queueDrawLine(vo.enemy.pos.x, vo.enemy.pos.y, vo.enemy.pos.x + vo.enemy.vel.x, vo.enemy.pos.y + vo.enemy.vel.y, 1, "blue");
        }
    }

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

    // clamps a velocity so it doesn't violate wall boundaries. essentially the "sliding" velocity.
    function clampToWalls(vel) {
        let vx = vel.x;
        let vy = vel.y;

        for (const hp of wallHPS) {
            // calculate the limit for this wall (rhs)
            const limit = hp.rhs();

            // check component of velocity in direction of wall normal
            const velInNormal = hp.nx * vx + hp.ny * vy;

            // if limit is exceeded (moving into the wall too fast)
            if (velInNormal > limit) {
                // remove the excess velocity into the wall
                vx -= hp.nx * (velInNormal - limit);
                vy -= hp.ny * (velInNormal - limit);
            }
        }
        return new Vector(vx, vy);
    }

    // main function. takes in intent vector and returns the intent vector of the best velocity vector
    function findSafeVelocity(intentVec) {
        if (!intentVec) return null;

        const vRaw = new Vector(intentVec.x * player.maxSpeed, intentVec.y * player.maxSpeed);
        const vPref = clampToWalls(vRaw);
        const vPrefInBounds = satisfyHPS(vPref);
        const vos = buildAllVos(globalTau);

        // build the set of VOs that contain vPref
        const vosWithPref = [];
        for (let i = 0; i < vos.length; i++) {
            if (insideVO(vos[i], vPref, globalTau)) {
                vosWithPref.push(vos[i]);
            }
        }

        if (settings.drawing.showVo) {
            drawVos(vos, vosWithPref, vPref, vPrefInBounds);
        }

        // if preferred velocity is safe, just return the original intent vector
        if (vosWithPref.length === 0) {
            return intentVec;
        }
        // otherwise, find a safe velocity closest in angle to vPref, if one exists
        const vSafe = discreteSampling(vos, vPref, vosWithPref, globalTau);

        // return a corrected intent vector, not a velocity
        if (vSafe !== null) {
            vSafe.scale(1 / player.maxSpeed);
        }
        return vSafe;
    }

    function discreteSampling(vos, vPref, vosWithPref, tau) {
        // pick the candidate velocity with closest magnitude and angle to vPref (use squared euclidean distance)
        let bestCand = null;
        let minDistSq = Infinity;

        const vPrefMag = vPref.magnitude();
        for (let speedInc = speedDivisions; speedInc > 0; speedInc--) {
            const speed = player.maxSpeed * speedInc / speedDivisions;

            // optimization: find the "best theoretical distance" at this speed tier
            // assume the angle is perfectly aligned with vPref, so the distance is |speed - vPrefMag|
            const diff = speed - vPrefMag;
            const theoreticalMinDistSq = diff * diff;

            // if the perfect case is worse than minDistSq, no speed <= this can beat it. stop searching
            if (theoreticalMinDistSq >= minDistSq) {
                break;
            }

            for (const vo of vosWithPref) {
                for (const leg of [vo.leftLeg, vo.rightLeg]) {
                    const dot = vo.apex.x * leg.x + vo.apex.y * leg.y;
                    const disc = dot*dot - (vo.apex.x*vo.apex.x + vo.apex.y*vo.apex.y - speed*speed);
                    if (disc < 0) continue;
                    const s = -dot + Math.sqrt(disc);
                    if (s < 0) continue;

                    // skip worse candidates
                    const candX = vo.apex.x + leg.x * s;
                    const candY = vo.apex.y + leg.y * s;
                    const dx = candX - vPref.x;
                    const dy = candY - vPref.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq >= minDistSq) continue;

                    // construct candidate vector and check feasibility
                    const cand = new Vector(candX, candY);
                    if (!satisfyHPS(cand)) continue;
                    let feasible = true;
                    for (const vo2 of vos) {
                        if (vo2 === vo) continue;
                        if (insideVO(vo2, cand, tau)) {
                            feasible = false;
                            break;
                        }
                    }

                    // if it's safe, it is now the new best candidate
                    if (feasible) {
                        minDistSq = distSq;
                        bestCand = cand;
                    }
                }
            }
        }

        //if (best === null) {console.log("found no safe velocity"); return null;}
        // keep temporary 1 frame lookahead fallback, might help escape traps?
        if (tau === globalTau) {
            if (bestCand === null) {
                const fallback = discreteSampling(vos, vPref, vosWithPref, settings.SPT * 1);
                if (fallback === null) {
                    console.log("found no safe velocity");
                } else {
                    drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + fallback.x, player.pos.y + fallback.y, 1, "gold");
                }
                return fallback;
            }
            drawer.queueDrawLine(player.pos.x, player.pos.y, player.pos.x + bestCand.x, player.pos.y + bestCand.y, 1, "aqua");
        }
        return bestCand;
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
        return {enemy, apex, leftLeg, rightLeg, relPos, rad: voRadius};
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