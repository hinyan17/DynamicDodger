export class Vector {
    constructor(x, y) {
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

    normalize() {
        const mag = this.magnitude();
        this.x /= mag;
        this.y /= mag;
    }

    clamp(max) {
        const mag = this.magnitude();
        if (mag > max) {
            const scale = max / mag;
            this.x *= scale;
            this.y *= scale;
        }
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

export function getRandomCoords(area, radius) {
    const minX = area.leftSafeX + radius;
    const maxX = area.rightSafeX - radius;
    const minY = area.y + radius;
    const maxY = area.y + area.height - radius;
    const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    return new Vector(x, y);
}

export function getRandomAngle() {
    return Math.random() * 2 * Math.PI;
}
