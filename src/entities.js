import { Vector } from "./utils.js";

export class Player {
    constructor(pos, radius, maxSpeed) {
        this.pos = pos;
        this.radius = radius;
        this.maxSpeed = maxSpeed;
        this.slowEffect = undefined;
    }

    resetEffects() {
        this.slowEffect = undefined;
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
        this.pos.x = Math.min(Math.max(area.x + this.radius, this.pos.x), area.x + area.width - this.radius);
        this.pos.y = Math.min(Math.max(area.y + this.radius, this.pos.y), area.y + area.height - this.radius);
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
    constructor(data, context) {
        this.type = data.type;
        this.radius = data.radius;
        this.speed = data.speed;
        this.pos = context.spawn;
        this.vel = new Vector(Math.cos(context.angle) * data.speed, Math.sin(context.angle) * data.speed);
    }

    move(dt, area) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
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
    constructor(data, context) {
        super(data, context);
        this.color = "#939393";
    }
}

export class Slowing extends Enemy {
    constructor(data, context) {
        super(data, context);
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
    constructor(data, context) {
        super(data, context);
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
    constructor(data, context) {
        super(data, context);
        this.color = "#0000ff";
        this.aura = new Aura("rgba(0, 0, 255, 0.15)", data.auraRadius);
    }
}

export class Wall extends Enemy {
    constructor(data, context) {
        super(data, context);
        this.color = "#222222";

        // vel and angle are ignored here, pos is manually updated
        this.vel.x = 0;
        this.vel.y = 0;
        this.angle = 0;

        this.clockwise = data.clockwise;
        this.bounds = {
            x: context.area.leftSafeX + data.radius,
            y: context.area.y + data.radius,
            w: context.area.rightSafeX - context.area.leftSafeX - data.radius * 2,
            h: context.area.height - data.radius * 2
        };
        this.perimeter = (this.bounds.w * 2) + (this.bounds.h * 2);
        // set distanceTraveled to the perimeter point equal to the spawn location
        this.distanceTraveled = this.perimeter * (context.index / data.count);
        // move to the spawn location
        this.updatePosVec();
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
        this.updatePosVec();
    }

    updatePosVec() {
        // update the actual position vector
        if (this.distanceTraveled < this.bounds.w) {
            // top edge
            this.pos.x = this.bounds.x + this.distanceTraveled;
            this.pos.y = this.bounds.y;
        }
        else if (this.distanceTraveled < this.bounds.w + this.bounds.h) {
            // right edge
            let offset = this.distanceTraveled - this.bounds.w;
            this.pos.x = this.bounds.x + this.bounds.w;
            this.pos.y = this.bounds.y + offset;
        }
        else if (this.distanceTraveled < (this.bounds.w * 2) + this.bounds.h) {
            // bottom edge
            let offset = this.distanceTraveled - (this.bounds.w + this.bounds.h);
            this.pos.x = (this.bounds.x + this.bounds.w) - offset;
            this.pos.y = this.bounds.y + this.bounds.h;
        }
        else {
            // left edge
            let offset = this.distanceTraveled - ((this.bounds.w * 2) + this.bounds.h);
            this.pos.x = this.bounds.x;
            this.pos.y = (this.bounds.y + this.bounds.h) - offset;
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
    Normal, Wall, Slowing, Draining, Withering
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
