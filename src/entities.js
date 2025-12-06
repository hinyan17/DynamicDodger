import { Vector } from "./utils.js";

export const EntityType = {
    PLAYER: 0,
    NORMAL: 1,
    WALL: 2,
    SLOWING: 3,
    DRAINING: 4,
    HOMING: 5,
    SNIPER: 6
};

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

    move(dt, inputVec, area) {
        const adj = inputVec.clamp(maxSpeed);

        let dx = adj.x * dt;
        let dy = adj.y * dt;
        if (this.slowEffect) {
            dx *= this.slowEffect;
            dy *= this.slowEffect;
        }
        this.pos.x += dx;
        this.pos.y += dy;
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

class Enemy {
    constructor(type, pos, radius, speed, angle, color, aura) {
        this.type = type;
        this.pos = pos;
        this.radius = radius;
        this.speed = speed;
        this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.color = color;
        this.aura = aura;
    }

    move(dt, area) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        if (this.type !== EntityType.WALL) {
            this.checkAreaCollision(area);
        }
    }

    checkAreaCollision(area) {
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

    auraEffect() {}
}

export class Normal extends Enemy {
    constructor(pos, radius, speed, angle) {
        super(EntityType.NORMAL, pos, radius, speed, angle, "#939393");
    }
}

export class Slowing extends Enemy {
    constructor(pos, radius, speed, angle, auraRadius) {
        super(EntityType.SLOWING, pos, radius, speed, angle, "#ff0000", true);
        this.auraColor = "rgba(255, 0, 0, 0.15)";
        this.auraRadius = auraRadius;
        this.slow = 0.3;
    }

    auraEffect(player) {
        if (player.pos.distance(this.pos) < player.radius + this.auraRadius) {
            player.slowEffect = 1 - this.slow;
        }
    }
}

class Draining extends Enemy {
    constructor(pos, radius, speed, angle, auraRadius) {
        super(EntityType.SLOWING, pos, radius, speed, angle, "#0000ff", true);
        this.auraColor = "rgba(0, 0, 255, 0.15)";
        this.auraRadius = auraRadius;
    }
}

export class Wall extends Enemy {
    constructor(radius, speed, clockwise, startRatio, area) {
        // vel and angle are ignored here, pos is manually updated
        super(EntityType.WALL, new Vector(0, 0), radius, speed, 0, "#222222");

        this.clockwise = clockwise;
        this.bounds = {
            x: area.leftSafeX + radius,
            y: area.y + radius,
            w: area.rightSafeX - area.leftSafeX - radius * 2,
            h: area.height - radius * 2
        };
        this.perimeter = (this.bounds.w * 2) + (this.bounds.h * 2);
        this.distanceTraveled = this.perimeter * startRatio;
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
