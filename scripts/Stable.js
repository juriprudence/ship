import { drawEmoji } from './Utils.js';

export class Stable {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 80;

        this.sheepCapacity = 7;
        this.containedSheep = [];

        // Resources
        this.food = 100; // Decays over time
        this.water = 100; // Infinite for simplicity? Or decays too. Let's make food the main decay factor for stable life.
        this.goldAccumulated = 0;

        this.isDestroyed = false;

        this.timer = 0;
    }

    update(dt) {
        if (this.isDestroyed) return;

        // Decay food
        // Lasts for about 2 minutes (120 seconds) => 100 / 120 ~= 0.8 per sec
        this.food -= dt * 0.8;

        if (this.food <= 0) {
            this.destroy();
            return;
        }

        // Generate gold based on sheep count
        // Each sheep gives 1 gold per 5 seconds
        if (this.containedSheep.length > 0) {
            this.timer += dt;
            if (this.timer > 5) {
                this.goldAccumulated += this.containedSheep.length * 10;
                this.timer = 0;
            }
        }

        // Keep sheep needs satisfied
        this.containedSheep.forEach(sheep => {
            sheep.hunger = 0;
            sheep.thirst = 0;
            // Wool continues to grow? Maybe slower or faster? Let's say normal rate.
            sheep.woolGrowth += dt * 5;
        });
    }

    addSheep(sheep) {
        if (this.containedSheep.length >= this.sheepCapacity) return false;
        this.containedSheep.push(sheep);
        sheep.enterStable(this);
        return true;
    }

    collectGold() {
        const amount = this.goldAccumulated;
        this.goldAccumulated = 0;
        return amount;
    }

    destroy() {
        this.isDestroyed = true;
        this.containedSheep.forEach(sheep => {
            sheep.exitStable(this.x, this.y);
        });
        this.containedSheep = [];
    }

    draw(ctx) {
        // Draw Stable Body
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Roof
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2 - 10, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2 + 10, this.y - this.height / 2);
        ctx.lineTo(this.x, this.y - this.height / 2 - 40);
        ctx.fill();

        // Door
        ctx.fillStyle = '#2d1a10';
        ctx.fillRect(this.x - 15, this.y, 30, 40);

        // Gold Indicator
        if (this.goldAccumulated > 0) {
            drawEmoji(ctx, this.x, this.y - 60, '💰', 24);
        }

        // Food Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - 40, this.y + 50, 80, 6);
        ctx.fillStyle = this.food > 30 ? '#6ab04c' : 'red';
        const foodW = (this.food / 100) * 80;
        ctx.fillRect(this.x - 40, this.y + 50, Math.max(0, foodW), 6);

        // Sheep Count
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`${this.containedSheep.length}/${this.sheepCapacity}`, this.x, this.y - 20);
    }
}
