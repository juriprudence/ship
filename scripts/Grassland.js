import { drawEmoji } from './Utils.js';

export class Grassland {
    constructor(x, y, rangeMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.baseRadius = 80;
        this.radius = 80;
        this.amount = 500;
        this.maxAmount = 500;
        this.isExpired = false;
        this.respawnTimer = 0;
        this.rangeMultiplier = rangeMultiplier;
        this.consumptionMultiplier = 1.0;
    }

    consume(request) {
        if (this.amount <= 0) return 0;
        // The effective request is modified by the multiplier
        const actualRequest = request * this.consumptionMultiplier;
        const actual = Math.min(this.amount, actualRequest);
        this.amount -= actual;

        // Update visual radius based on remaining amount
        const ratio = this.amount / this.maxAmount;
        this.radius = 20 + (this.baseRadius - 20) * ratio;

        if (this.amount <= 0) {
            this.isExpired = true;
        }

        return actual;
    }

    update(dt, playerX, playerY, day) {
        if (this.isExpired) {
            this.respawnTimer += dt;
            if (this.respawnTimer > 3) { // 3 seconds delay before respawning
                this.respawn(playerX, playerY, day);
                return true; // Signal that it just respawned
            }
        }
        return false;
    }

    respawn(playerX, playerY, day) {
        // Increases distance based on day
        const minDistance = 500 + (day - 1) * 200;
        const maxDistance = 1000 + (day - 1) * 300;

        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);

        this.x = playerX + Math.cos(angle) * distance;
        this.y = playerY + Math.sin(angle) * distance;

        this.amount = this.maxAmount;
        this.radius = this.baseRadius;
        this.isExpired = false;
        this.respawnTimer = 0;

        // Decrease consumption rate for the new spawn (makes it last longer)
        this.consumptionMultiplier = Math.max(0.3, this.consumptionMultiplier * 0.9);
    }

    draw(ctx) {
        if (this.amount <= 0) return;

        ctx.fillStyle = '#6ab04c'; // Green
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#346d29';
        ctx.lineWidth = 5;
        ctx.stroke();
        drawEmoji(ctx, this.x, this.y, '🌿', 50);
    }

    checkBounds(qx, qy) {
        if (this.isExpired) return false;
        const dx = this.x - qx;
        const dy = this.y - qy;
        return (dx * dx + dy * dy < this.radius * this.radius);
    }
}
