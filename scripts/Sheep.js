import { drawEmoji } from './Utils.js';

export class Sheep {
    constructor(playerX, playerY) {
        this.x = playerX + Math.random() * 100 - 50;
        this.y = playerY + Math.random() * 100 - 50;
        this.color = '#fff';
        this.woolGrowth = 0; // 0 to 100
        this.thirst = 0; // 0 to 120
        this.hunger = 0; // 0 to 120
        this.state = 'idle';
        this.id = Math.random();
        this.wanderAngle = 0;
    }

    update(dt, player, world, sheepList, gameRef) { // gameRef needed for notifications/gold? Maybe just return events.
        // Let's keep it simple: return events or update self. 
        // We will pass essential data.

        // 1. Wool Growth
        if (this.woolGrowth < 100) this.woolGrowth += dt * 5;

        // 2. Thirst & Hunger
        this.thirst += dt * 2.0;
        this.hunger += dt * 1.5;
        if (this.thirst > 120) this.thirst = 120;
        if (this.hunger > 120) this.hunger = 120;

        // Check Death
        if (this.thirst > 100 || this.hunger > 100) {
            return { died: true, cause: this.thirst > 100 ? "العطش" : "الجوع" };
        }

        // --- Interactions ---
        const distToOasis = Math.hypot(this.x - world.oasis.x, this.y - world.oasis.y);
        const inOasis = distToOasis < world.oasis.radius;

        const distToGrass = Math.hypot(this.x - world.grassland.x, this.y - world.grassland.y);
        const inGrassland = distToGrass < world.grassland.radius;

        if (inOasis) {
            this.thirst -= dt * 30;
            if (this.thirst < 0) this.thirst = 0;
        }

        if (inGrassland) {
            this.hunger -= dt * 25;
            if (this.hunger < 0) this.hunger = 0;
        }

        // --- Movement Logic ---
        let moveX = 0;
        let moveY = 0;
        let speed = 40;
        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);

        if (this.thirst > 70 && !inOasis) {
            const angle = Math.atan2(world.oasis.y - this.y, world.oasis.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            speed = 60;
        } else if (this.hunger > 70 && !inGrassland) {
            const angle = Math.atan2(world.grassland.y - this.y, world.grassland.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            speed = 60;
        } else if (distToPlayer < 150) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            if (distToPlayer > 50) {
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
                speed = player.isMoving ? player.speed * 0.9 : 20;
            } else {
                if (Math.random() < 0.02) this.wanderAngle = Math.random() * Math.PI * 2;
                moveX = Math.cos(this.wanderAngle || 0) * 0.5;
                moveY = Math.sin(this.wanderAngle || 0) * 0.5;
            }
        } else {
            if (Math.random() < 0.01) this.wanderAngle = Math.random() * Math.PI * 2;
            moveX = Math.cos(this.wanderAngle || 0) * 0.2;
            moveY = Math.sin(this.wanderAngle || 0) * 0.2;
        }

        // Separation
        sheepList.forEach(other => {
            if (this === other) return;
            const d = Math.hypot(this.x - other.x, this.y - other.y);
            if (d < 20) {
                const pushAngle = Math.atan2(this.y - other.y, this.x - other.x);
                moveX += Math.cos(pushAngle) * 2;
                moveY += Math.sin(pushAngle) * 2;
            }
        });

        this.x += moveX * speed * dt;
        this.y += moveY * speed * dt;

        return null; // No special event
    }

    draw(ctx) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 10, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Visual indicator for wool readiness
        if (this.woolGrowth >= 100) {
            ctx.shadowColor = "white";
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowBlur = 0;
        }

        drawEmoji(ctx, this.x, this.y, '🐑', 24);
        ctx.shadowBlur = 0;

        // Thirst meter
        if (this.thirst > 50) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 25, 20, 4);
            ctx.fillStyle = this.thirst > 80 ? 'red' : '#4fa4b8';
            const thirstW = (1 - (this.thirst / 100)) * 20;
            ctx.fillRect(this.x - 10, this.y - 25, Math.max(0, thirstW), 4);
        }

        // Hunger meter
        if (this.hunger > 50) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 32, 20, 4);
            ctx.fillStyle = this.hunger > 80 ? 'red' : '#a0522d';
            const hungerW = (1 - (this.hunger / 100)) * 20;
            ctx.fillRect(this.x - 10, this.y - 32, Math.max(0, hungerW), 4);
        }
    }
}
