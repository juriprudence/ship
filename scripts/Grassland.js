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

    draw(ctx, tilesetImage, baseTileSize = 16) {
        if (this.amount <= 0) return;

        // Fallback or debug circle (optional, maybe very light)
        /*
        ctx.fillStyle = 'rgba(106, 176, 76, 0.1)'; 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        */

        if (tilesetImage && tilesetImage.complete) {
            const columns = 8; // 128 / 16
            const grassStartIndex = 56;
            const drawScale = 4; // Same as TileMap default or similar
            const scaledTileSize = baseTileSize * drawScale;

            // Draw a cluster of tiles to cover the radius
            // We'll use a simple grid that roughly covers the circular area
            const step = scaledTileSize * 0.8; // Overlap slightly
            for (let ox = -this.radius; ox < this.radius; ox += step) {
                for (let oy = -this.radius; oy < this.radius; oy += step) {
                    // Check if within radius
                    if (ox * ox + oy * oy > this.radius * this.radius) continue;

                    // Pick a random grass tile from the 3x3 block (56-64)
                    // indices are: 56, 57, 58, 64, 65, 66... wait, let's check IDs again.
                    // ID 56 to 64 is 9 tiles. 
                    const randomGrassId = grassStartIndex + Math.floor(Math.random() * 9);
                    // Actually, for consistency during a single frame/instance, 
                    // we might want a stable "random" but let's just use a simple mock for now.
                    // To stay stable, we can use coordinates.
                    const stableId = grassStartIndex + (Math.abs(Math.floor((this.x + ox) / 10) + Math.floor((this.y + oy) / 10)) % 9);

                    const srcX = (stableId % columns) * baseTileSize;
                    const srcY = Math.floor(stableId / columns) * baseTileSize;

                    ctx.drawImage(
                        tilesetImage,
                        srcX, srcY, baseTileSize, baseTileSize,
                        this.x + ox - scaledTileSize / 2, this.y + oy - scaledTileSize / 2,
                        scaledTileSize, scaledTileSize
                    );
                }
            }
        } else {
            // Fallback to emoji if image not ready
            ctx.fillStyle = '#6ab04c';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            drawEmoji(ctx, this.x, this.y, '🌿', 50);
        }
    }

    checkBounds(qx, qy) {
        if (this.isExpired) return false;
        const dx = this.x - qx;
        const dy = this.y - qy;
        return (dx * dx + dy * dy < this.radius * this.radius);
    }
}
