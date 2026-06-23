import { Vector, Aura, Pulsation, getRandomCoords, getRandomAngle, distSqToRect, circleInRect } from "../utils.js";

const PlayerState = Object.freeze({
    ACTIVE: 0,
    DOWNED: 1,
    DEAD: 2
});

export class Player {

    static uuid = 0;

    constructor(playerData) {
        this.id = Player.uuid;
        Player.uuid++;
        this.location = {worldId: 0, areaId: 0};
        this.camera = new Vector(0, 0);
        this.intentVec = new Vector(0, 0);
        this.lastMoveDelta = new Vector(0, 0);
        this.name = playerData.name;
        this.color = playerData.color;
        this.accessories = this.createAccessories(playerData);
        this.radius = playerData.radius;
        this.maxSpeed = playerData.speed;
        this.pos = new Vector(playerData.x, playerData.y);
        this.state = PlayerState.ACTIVE;
        this.isGod = false;
        this.downedTimer = 60;
        this.invincTimer = 0;
        this.slowEffect = undefined;
    }

    createAccessories(playerData) {
        const acc = { hat: new Image(), gem: new Image() };
        acc.hat.src = playerData.hatSrc;
        acc.gem.src = playerData.gemSrc;
        acc.isCrown = acc.hat.src.includes("crown");
        return acc;
    }

    setLocation(worldId, areaId) {
        // be very careful with object reference
        this.location = {worldId, areaId};
    }

    updateIntent(vec) {
        if (vec) {
            this.intentVec.set(vec.x, vec.y);
        } else {
            this.intentVec.set(0, 0);
        }
    }

    move(dt, friction) {
        const frictionFactor = 1 - friction;
        const speed = this.maxSpeed * (this.slowEffect ?? 1);
        const cap = speed * dt;
        const desired = new Vector(
            this.intentVec.x * cap + this.lastMoveDelta.x * frictionFactor,
            this.intentVec.y * cap + this.lastMoveDelta.y * frictionFactor
        );

        const absX = Math.abs(desired.x);
        const absY = Math.abs(desired.y);
        if (absX < 0.001) {
            desired.x = 0;
        } else if (absX > cap) {
            desired.x *= cap / absX;
        }
        if (absY < 0.001) {
            desired.y = 0;
        } else if (absY > cap) {
            desired.y *= cap / absY;
        }

        this.lastMoveDelta.set(desired.x, desired.y);
        this.pos.translate(desired.x, desired.y);
    }

    applyAreaCollision(areaSize) {
        // force clamp in bounds of current area
        this.pos.x = Math.min(
            Math.max(this.radius, this.pos.x),
            areaSize.x - this.radius
        );
        this.pos.y = Math.min(
            Math.max(this.radius, this.pos.y),
            areaSize.y - this.radius
        );
    }

    applyEnemyCollision(enemies) {
        if (this.isGod || this.invincTimer > 0) return;
        for (const e of enemies) {
            if (this.pos.distance(e.pos) < this.radius + e.radius) {
                this.down();
                return;
            }
        }
    }

    applyPelletCollision(pellets) {
        for (const p of pellets) {
            if (this.pos.distance(p.pos) < Pellet.baseRadius + this.radius) {
                p.reset();
            }
        }
    }

    updateDownedState(dt, players) {
        if (this.isGod) {
            this.revive();
            return;
        }

        let saved = false;
        for (const p of players) {
            if (p === this || !p.isActive()) continue;
            if (p.pos.distance(this.pos) < p.radius + this.radius) {
                saved = true;
                break;
            }
        }
        if (saved) {
            this.revive();
        } else {
            this.downedTimer -= dt;
            if (this.downedTimer <= 0) {
                this.markDead();
            }
        }
    }

    // check if player entered a teleporting zone
    checkTeleport(area) {
        for (const z of area.zones) {
            if (!z.translate) continue;

            // circle to rect collision
            const dist2 = distSqToRect(this.pos, z.pos, z.size);
            if (dist2 >= this.radius * this.radius) continue;

            const adjPos = new Vector(this.pos.x + z.translate.x, this.pos.y + z.translate.y);
            if (!circleInRect(adjPos, this.radius, new Vector(0, 0), area.size)) {
                // out of bounds, therefore continue
                return {
                    player: this,
                    adjPos,
                    sameWorldTP: z.type === "EXIT",
                    oldArea: area
                };
            } else {
                // allow same area teleporting for now?
                this.pos.set(adjPos.x, adjPos.y);
                break;
            }
        }
        return null;
    }

    reset(spawnX, spawnY) {
        this.pos.set(spawnX, spawnY);
        this.resetEffects();
        this.revive();
    }

    down() {
        if (!this.isActive()) return;
        this.state = PlayerState.DOWNED;
        this.downedTimer = 60;
    }

    revive() {
        if (!this.isDowned()) return;
        this.state = PlayerState.ACTIVE;
        this.downedTimer = 60;
    }

    markDead() {
        this.state = PlayerState.DEAD;
    }

    isActive() {
        return this.state === PlayerState.ACTIVE;
    }

    isDowned() {
        return this.state === PlayerState.DOWNED;
    }

    isDead() { 
        return this.state === PlayerState.DEAD;
    }

    // "timed" effects last for a certain time, like invincibility or debuff penalties
    // they are updated after movement and collision checks to last the frame they expire in
    updateTimedEffects(dt) {
        if (this.isDead()) return;
        /*
        // don't have enough effects yet to implement
        if (this.isDowned()) {
            // clear certain timed effects (speed penalty, freeze, etc), then decrement others
        } else {
            // decrement all timed effects
        }
        */
        this.invincTimer = Math.max(0, this.invincTimer - dt);
    }

    // "temp" effects are cleared and reapplied every frame, such as enemy aura effects
    // this happens before movement
    clearTempEffects() {
        this.slowEffect = undefined;
    }

    resetEffects() {
        this.invincTimer = 0;
        this.slowEffect = undefined;
    }

    applySlow(slow) {
        if (this.isGod || this.invincTimer > 0) return;
        this.slowEffect = Math.min(this.slowEffect ?? 1, 1 - slow);
    }

    toggleGod() {
        this.isGod = !this.isGod;
    }
}

export class Pellet {
    static baseRadius = 8;
    static oscillator = new Pulsation(1.1, 1.2, 0.15, true);
    static maxRadius = Pellet.baseRadius * Pellet.oscillator.max;
    static colors = ["#b84dd4", "#a32dd8", "#3b96fd", "#43c59b", "#f98f6b", "#61c736"];

    constructor(zonePos, zoneSize) {
        this.zonePos = zonePos;
        this.zoneSize = zoneSize;
        this.pos = new Vector(0, 0);
        this.color = Pellet.colors[Math.floor(Math.random() * Pellet.colors.length)];
        this.reset();
    }

    // pellets use area-local coords
    reset() {
        const newCoords = getRandomCoords(this.zonePos, this.zoneSize, Pellet.maxRadius);
        this.pos.set(newCoords.x, newCoords.y);
    }

    getEffectiveRadius() {
        return Pellet.baseRadius * Pellet.oscillator.value;
    }
}

class Enemy {

    // overridden funcs (reset) not allowed in constructor, so use create
    static create(config) {
        const instance = new this(config);
        instance.reset();
        return instance;
    }

    constructor(config) {
        this.zonePos = config.zonePos;
        this.zoneSize = config.zoneSize;
        this.type = config.type;
        this.radius = config.radius;
        this.speed = config.speed;
        this.pos = new Vector(0, 0);
        this.vel = new Vector(0, 0);
    }

    // enemies use area-local coords
    reset() {
        const spawn = getRandomCoords(this.zonePos, this.zoneSize, this.radius);
        const angle = getRandomAngle();
        this.pos.set(spawn.x, spawn.y);
        this.vel.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    }

    move(dt) {
        this.pos.translate(this.vel.x * dt, this.vel.y * dt);
    }

    applyAreaCollision(zonePos, zoneSize) {
        if (this instanceof Wall) return;
        // discrete collision detection, but with corrected (accurate) wall reflection
        // find effective limits (boundaries for the circle center)
        const minX = zonePos.x + this.radius;
        const maxX = zonePos.x + zoneSize.x - this.radius;
        const minY = zonePos.y + this.radius;
        const maxY = zonePos.y + zoneSize.y - this.radius;

        // x axis reflection
        if (this.pos.x < minX) {
            const overshoot = minX - this.pos.x;
            this.pos.x = minX + overshoot;
            this.vel.x = -this.vel.x;
        } else if (this.pos.x > maxX) {
            const overshoot = this.pos.x - maxX;
            this.pos.x = maxX - overshoot;
            this.vel.x = -this.vel.x;
        }

        // y axis reflection
        if (this.pos.y < minY) {
            const overshoot = minY - this.pos.y;
            this.pos.y = minY + overshoot;
            this.vel.y = -this.vel.y;
        } else if (this.pos.y > maxY) {
            const overshoot = this.pos.y - maxY;
            this.pos.y = maxY - overshoot;
            this.vel.y = -this.vel.y;
        }
    }

    applyAura(players) {
        if (!this.aura) return;
        for (const player of players) {
            if (player.pos.distance(this.pos) < player.radius + this.aura.radius) {
                this.applyAuraEffect(player);
            }
        }
    }

    applyAuraEffect() {}
}

export class Normal extends Enemy {
    constructor(config) {
        super(config);
        this.color = "#939393";
    }
}

export class Immune extends Enemy {
    constructor(config) {
        super(config);
        this.color = "#000000";
    }
}

export class Slowing extends Enemy {
    constructor(config) {
        super(config);
        this.color = "#ff0000";
        this.slow = 0.3;
        const auraRadius = config.effect_radius ?? 150;
        this.aura = new Aura("rgba(255, 0, 0, 0.15)", auraRadius);
    }

    applyAuraEffect(player) {
        player.applySlow(this.slow);
    }
}

export class Withering extends Enemy {
    constructor(config) {
        super(config);
        this.color = "rgb(117, 38, 86)";
        this.slow = 0.2;
        const auraRadius = config.effect_radius ?? 100;
        this.aura = new Aura("rgba(117, 38, 86, 0.15)", auraRadius);
    }

    applyAuraEffect(player) {
        player.applySlow(this.slow);
    }
}

class Draining extends Enemy {
    constructor(config) {
        super(config);
        this.color = "#0000ff";
        const auraRadius = config.effect_radius ?? 150;
        this.aura = new Aura("rgba(0, 0, 255, 0.15)", auraRadius);
    }
}

export class Wall extends Enemy {
    constructor(config) {
        super(config);
        this.color = "#222222";
        // anything besides false will set it to true, even if undefined
        this.clockwise = config.move_clockwise !== false;
        this.bounds = {
            x: config.zonePos.x + config.radius,
            y: config.zonePos.y + config.radius,
            w: config.zoneSize.x - config.radius * 2,
            h: config.zoneSize.y - config.radius * 2
        };
        this.perimeter = (this.bounds.w * 2) + (this.bounds.h * 2);
        this.startDistance = this.calcStartDist(config.index, config.count);
    }

    calcStartDist(index, count) {
        // distance to the centers of: top right bottom left
        const sideCenters = [
            this.bounds.w / 2,
            this.bounds.w + (this.bounds.h / 2),
            this.bounds.w + this.bounds.h + (this.bounds.w / 2),
            (this.bounds.w * 2) + this.bounds.h + (this.bounds.h / 2)
        ];

        // spawn the wall enemy leader at the center of the top wall. todo make this configurable later
        const baseOffset = sideCenters[0];

        // calculate the offset of the other wall enemies relative to the leader
        const spacing = this.perimeter * (index / count);

        return (baseOffset + spacing) % this.perimeter;
    }

    reset() {
        // override Enemy.reset()
        this.distanceTraveled = this.startDistance;
        this.updateMovement();
    }

    move(dt) {
        // move along the perimeter
        const moveAmount = this.speed * dt;
        if (this.clockwise) {
            this.distanceTraveled += moveAmount;
            if (this.distanceTraveled >= this.perimeter) {
                this.distanceTraveled -= this.perimeter;
            }
        } else {
            this.distanceTraveled -= moveAmount;
            if (this.distanceTraveled < 0) {
                this.distanceTraveled += this.perimeter;
            }
        }
        this.updateMovement();
    }

    updateMovement() {
        // update the position and velocity vectors
        // velocity is only used for velObs, only position matters here
        const dir = this.clockwise ? 1 : -1;
        if (this.distanceTraveled < this.bounds.w) {
            // top edge
            this.pos.x = this.bounds.x + this.distanceTraveled;
            this.pos.y = this.bounds.y;
            this.vel.set(this.speed * dir, 0);
        }
        else if (this.distanceTraveled < this.bounds.w + this.bounds.h) {
            // right edge
            let offset = this.distanceTraveled - this.bounds.w;
            this.pos.x = this.bounds.x + this.bounds.w;
            this.pos.y = this.bounds.y + offset;
            this.vel.set(0, this.speed * dir);
        }
        else if (this.distanceTraveled < (this.bounds.w * 2) + this.bounds.h) {
            // bottom edge
            let offset = this.distanceTraveled - (this.bounds.w + this.bounds.h);
            this.pos.x = (this.bounds.x + this.bounds.w) - offset;
            this.pos.y = this.bounds.y + this.bounds.h;
            this.vel.set(-this.speed * dir, 0);
        }
        else {
            // left edge
            let offset = this.distanceTraveled - ((this.bounds.w * 2) + this.bounds.h);
            this.pos.x = this.bounds.x;
            this.pos.y = (this.bounds.y + this.bounds.h) - offset;
            this.vel.set(0, -this.speed * dir);
        }
    }
}

class Homing extends Enemy {

}

class Sniper extends Enemy {

}

/*
Enum type (uppercase string): use for programming like an enum
Internal type (string): enemy "tag", also use for level files like JSON, YAML
Code (class): the actual class used to create an enemy object
*/
// maps: internal id (string) -> code (class)
export const EnemyRegistry = Object.freeze({
    Normal, Immune, Slowing, Withering, Draining, Wall
});

export function resolveEnemyClass(type) {
    const key = type.toLowerCase();
    const classKey = key.charAt(0).toUpperCase() + key.slice(1);
    const EnemyClass = EnemyRegistry[classKey];
    if (!EnemyClass) {
        throw new Error(`Unknown enemy type: ${type}`);
    }
    return EnemyClass;
}
