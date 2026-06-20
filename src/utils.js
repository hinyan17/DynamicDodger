export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    magnitude() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    distance(vec2) {
        const dx = vec2.x - this.x;
        const dy = vec2.y - this.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    scale(n) {
        this.x *= n;
        this.y *= n; 
    }

    translate(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

// check if a circle is fully contained in a rect
export function circleInRect(point, radius, rectPos, rectSize) {
    return point.x - radius >= rectPos.x &&
           point.x + radius <= rectPos.x + rectSize.x &&
           point.y - radius >= rectPos.y &&
           point.y + radius <= rectPos.y + rectSize.y;
}

// return the squared distance from a point to a rectangle
export function distSqToRect(point, rectPos, rectSize) {
    const closestX = Math.max(rectPos.x, Math.min(point.x, rectPos.x + rectSize.x));
    const closestY = Math.max(rectPos.y, Math.min(point.y, rectPos.y + rectSize.y));
    const distX = point.x - closestX;
    const distY = point.y - closestY;
    return distX * distX + distY * distY;
}

export function getRandomCoords(zonePos, zoneSize, radius) {
    const minX = zonePos.x + radius;
    const maxX = zonePos.x + zoneSize.x - radius;
    const minY = zonePos.y + radius;
    const maxY = zonePos.y + zoneSize.y - radius;
    const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    return new Vector(x, y);
}

const TWOPI = 2 * Math.PI;
export function getRandomAngle() {
    return Math.random() * TWOPI;
}

export function angularDifference(a, b) {
    const d = Math.abs(a - b) % TWOPI;
    return d > Math.PI ? TWOPI - d : d;
}

export const ZoneColors = Object.freeze({
    ACTIVE: "rgba(255, 255, 255, 1)",
    SAFE: "rgba(195, 195, 195, 1)",
    EXIT: "rgba(255, 244, 108, 1)",
    TELEPORT: "rgba(106, 208, 222, 1)",
    FLASHLIGHT: "rgba(255, 249, 186, 1)",
    VICTORY: "rgba(0,0,0,1)",
    REMOVAL: "rgba(0,255,0,1)"
});

export class Aura {
    constructor(color, radius) {
        this.color = color;
        this.radius = radius;
    }
}

export class Pulsation {
    constructor(min, max, increment, increasing) {
        this.value = min;
        this.min = min;
        this.max = max;
        this.increment = increment;
        this.increasing = increasing;
    }

    update(dt) {
        // dt is in seconds, increment is pix / seconds
        if (this.increasing) {
            this.value += this.increment * dt;
            if (this.value >= this.max) {
                this.value = this.max;
                this.increasing = false;
            }
        } else {
            this.value -= this.increment * dt;
            if (this.value <= this.min) {
                this.value = this.min;
                this.increasing = true;
            }
        }
    }
}
