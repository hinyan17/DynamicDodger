import { Vector, getRandomCoords, getRandomAngle } from "./utils.js";

export class Player {
    constructor(spawn, radius, maxSpeed) {
        this.color = "#1E90FF";
        this.name = "ur mom";
        this.spawn = new Vector(spawn.x, spawn.y);
        this.pos = new Vector(spawn.x, spawn.y);
        this.radius = radius;
        this.maxSpeed = maxSpeed;
        this.slowEffect = undefined;
    }

    resetEffects() {
        this.slowEffect = undefined;
    }

    reset() {
        // be careful not to modify vectors through reference
        this.pos.set(this.spawn.x, this.spawn.y);
        this.resetEffects();
    }

    move(dt, intentVec, area) {
        if (intentVec === null) return;

        let dx = intentVec.x * this.maxSpeed * dt;
        let dy = intentVec.y * this.maxSpeed * dt;
        if (this.slowEffect) {
            dx *= this.slowEffect;
            dy *= this.slowEffect;
        }
        this.pos.translate(dx, dy);
        this.checkAreaCollision(area);
    }

    checkAreaCollision(area) {
        this.pos.x = Math.min(
            Math.max(area.x + this.radius, this.pos.x),
            area.x + area.width - this.radius
        );
        this.pos.y = Math.min(
            Math.max(area.y + this.radius, this.pos.y),
            area.y + area.height - this.radius
        );
    }

    checkDead(enemies) {
        // tunneling exists, but will probably never happen
        for (const e of enemies) {
            if (this.pos.distance(e.pos) <= this.radius + e.radius) {
                return true;
            }
        }
        return false;
    }
}

class Aura {
    constructor(color, radius) {
        this.color = color;
        this.radius = radius;
    }
}

class Enemy {
    // creates instance, then runs reset()
    // this is so reset() can be polymorphic, overridden funcs not allowed in constructor
    static create(data, context) {
        const instance = new this(data, context);
        instance.reset(context.area);
        return instance;
    }

    // internal only. use create()
    constructor(data) {
        this.type = data.type;
        this.radius = data.radius;
        this.speed = data.speed;
        this.pos = new Vector(0, 0);
        this.vel = new Vector(0, 0);
    }

    reset(area) {
        const spawn = getRandomCoords(area, this.radius);
        const angle = getRandomAngle();
        this.pos.set(spawn.x, spawn.y);
        this.vel.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    }

    move(dt, area) {
        this.pos.translate(this.vel.x * dt, this.vel.y * dt);
        if (!(this instanceof Wall)) {
            this.checkAreaCollision(area);
        }
    }

    checkAreaCollision(area) {
        // discrete collision detection, but with corrected (accurate) wall reflection
        // find effective limits (boundaries for the circle center)
        const minX = area.leftSafeX + this.radius;
        const maxX = area.rightSafeX - this.radius;
        const minY = area.y + this.radius;
        const maxY = area.y + area.height - this.radius;

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

    applyAura() {}
}

export class Normal extends Enemy {
    constructor(data) {
        super(data);
        this.color = "#939393";
    }
}

export class Immune extends Enemy {
    constructor(data) {
        super(data);
        this.color = "#000000";
    }
}

export class Slowing extends Enemy {
    constructor(data) {
        super(data);
        this.color = "#ff0000";
        this.aura = new Aura("rgba(255, 0, 0, 0.15)", data.auraRadius);
        this.slow = 0.3;
    }

    applyAura(player) {
        if (player.pos.distance(this.pos) < player.radius + this.aura.radius) {
            player.slowEffect = 1 - this.slow;
        }
    }
}

export class Withering extends Enemy {
    constructor(data) {
        super(data);
        this.color = "rgb(117, 38, 86)";
        this.aura = new Aura("rgba(117, 38, 86, 0.15)", data.auraRadius);
        this.slow = 0.2;
    }

    applyAura(player) {
        if (player.pos.distance(this.pos) < player.radius + this.aura.radius) {
            player.slowEffect = 1 - this.slow;
        }
    }
}

class Draining extends Enemy {
    constructor(data) {
        super(data);
        this.color = "#0000ff";
        this.aura = new Aura("rgba(0, 0, 255, 0.15)", data.auraRadius);
    }
}

export class Wall extends Enemy {
    constructor(data, context) {
        super(data);
        this.color = "#222222";
        this.clockwise = data.clockwise;
        this.bounds = {
            x: context.area.leftSafeX + data.radius,
            y: context.area.y + data.radius,
            w: context.area.rightSafeX - context.area.leftSafeX - data.radius * 2,
            h: context.area.height - data.radius * 2
        };
        this.perimeter = (this.bounds.w * 2) + (this.bounds.h * 2);
        this.startDistance = this.calcStartDist(context.index, data.count);
    }

    calcStartDist(index, count) {
        // distance to the centers of: top right bottom left
        const sideCenters = [
            this.bounds.w / 2,
            this.bounds.w + (this.bounds.h / 2),
            this.bounds.w + this.bounds.h + (this.bounds.w / 2),
            (this.bounds.w * 2) + this.bounds.h + (this.bounds.h / 2)
        ];

        // spawn the wall enemy leader at the center of the top wall. make this configurable later
        const baseOffset = sideCenters[0];

        // calculate the offset of the other wall enemies relative to the leader
        const spacing = this.perimeter * (index / count);

        return (baseOffset + spacing) % this.perimeter;
    }

    reset() {
        // override Enemy.reset(area)
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

// maps: enum type (uppercase string) -> internal id (string)
export const EnemyType = Object.freeze(
    Object.keys(EnemyRegistry).reduce(
        (acc, key) => {
            const upperKey = key.toUpperCase();
            acc[upperKey] = key;
            return acc;
        }, {}
    )
);
