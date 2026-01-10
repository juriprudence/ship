
export function drawEmoji(ctx, x, y, emoji, size) {
    ctx.font = `${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
}

export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 100;
        this.vy = (Math.random() - 0.5) * 100;
        this.life = 1.0;
        this.color = color;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.life = 0.5;
    }

    update(dt) {
        this.radius += dt * 30;
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = '#8ED6FF';
        ctx.lineWidth = 1;

        ctx.globalAlpha = Math.max(0, this.life) * 0.8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Secondary ring
        if (this.radius > 5) {
            ctx.globalAlpha = Math.max(0, this.life - 0.2) * 0.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export class DustParticle {
    constructor(x, y) {
        this.x = x + (Math.random() - 0.5) * 10;
        this.y = y + (Math.random() - 0.5) * 5;
        this.vx = (Math.random() - 0.5) * 40;
        this.vy = -Math.random() * 20 - 10; // Drifts upward
        this.life = 0.8 + Math.random() * 0.4;
        this.startLife = this.life;
        this.size = 2 + Math.random() * 3;
        // Dusty color palette: tan, sand, light gray
        const colors = ['#d2b48c', '#e6c288', '#cdaa7d', '#bdb76b'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 20 * dt; // Slight "gravity" to slow the ascent or settle
        this.vx *= 0.95; // Air resistance
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        const alpha = Math.max(0, this.life / this.startLife);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha * 0.6; // Slightly transparent
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class FloatingText {
    constructor(x, y, text, color = '#fff', size = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0;
        this.vy = -30; // Float upwards
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
