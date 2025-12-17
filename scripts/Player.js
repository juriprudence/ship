import { drawEmoji } from './Utils.js';

export class Player {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.speed = 150;
        this.radius = 12;
        this.isMoving = false;
        this.actionRange = 60;
    }

    update(dt) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const moveX = (dx / dist) * this.speed * dt;
            const moveY = (dy / dist) * this.speed * dt;
            this.x += moveX;
            this.y += moveY;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }
    }

    handleInput(clickX, clickY) {
        this.targetX = clickX;
        this.targetY = clickY;
        this.isMoving = true;
    }

    draw(ctx, time) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 12, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        drawEmoji(ctx, this.x, this.y, '👳', 32);

        // Target marker
        if (this.isMoving) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.targetX, this.targetY, 5 + Math.sin(time * 10) * 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
