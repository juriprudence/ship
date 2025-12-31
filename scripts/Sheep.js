import { drawEmoji } from './Utils.js';
import { Animal } from './Animal.js';

const sheepImages = {
    down: new Image(),
    up: new Image(),
    right: new Image(),
    walk: [new Image(), new Image(), new Image(), new Image()], // 4 frames for walk animation
    eat: [new Image(), new Image()] // 2 frames for eating/drinking animation
};

let sheepImagesLoaded = false;
function loadSheepImages(assets) {
    if (sheepImagesLoaded) return;
    if (assets) {
        sheepImages.down = assets.getAsset('images', 'images/sheep/down.png');
        sheepImages.up = assets.getAsset('images', 'images/sheep/up.png');
        sheepImages.right = assets.getAsset('images', 'images/sheep/right.png');
        sheepImages.walk[0] = assets.getAsset('images', 'images/sheep/left.png');
        sheepImages.walk[1] = assets.getAsset('images', 'images/sheep/walk_1.png');
        sheepImages.walk[2] = assets.getAsset('images', 'images/sheep/walk_2.png');
        sheepImages.walk[3] = assets.getAsset('images', 'images/sheep/walk_3.png');
        sheepImages.eat[0] = assets.getAsset('images', 'images/sheep/head_down/eat (1).png');
        sheepImages.eat[1] = assets.getAsset('images', 'images/sheep/head_down/eat (2).png');
    } else {
        sheepImages.down.src = 'images/sheep/down.png';
        sheepImages.up.src = 'images/sheep/up.png';
        sheepImages.right.src = 'images/sheep/right.png';
        sheepImages.walk[0].src = 'images/sheep/left.png';    // Frame 0
        sheepImages.walk[1].src = 'images/sheep/walk_1.png';  // Frame 1
        sheepImages.walk[2].src = 'images/sheep/walk_2.png';  // Frame 2
        sheepImages.walk[3].src = 'images/sheep/walk_3.png';  // Frame 3
        sheepImages.eat[0].src = 'images/sheep/head_down/eat (1).png';
        sheepImages.eat[1].src = 'images/sheep/head_down/eat (2).png';
    }
    sheepImagesLoaded = true;
}

export class Sheep extends Animal {
    constructor(x, y, assets) {
        super(x, y);
        loadSheepImages(assets);
        this.color = '#fff';
        this.woolGrowth = 0; // 0 to 100
        
        // Override dimensions for sheep
        this.width = 80;
        this.height = 80;
    }

    update(dt, player, world, sheepList, trought) {
        // 1. Wool Growth
        if (this.woolGrowth < 100) this.woolGrowth += dt * 5;

        // 2. Core animal needs (thirst, hunger, death check)
        const deathResult = this.updateCore(dt);
        if (deathResult) return deathResult;

        // --- Environment Checks ---
        const distToOasis = Math.hypot(this.x - world.oasis.x, this.y - world.oasis.y);
        const inOasis = distToOasis < world.oasis.radius;
        const inMapWater = world.tileMap ? world.tileMap.isPositionInLayer(this.x, this.y, 'water') : false;
        const inMapGrass = world.tileMap ? world.tileMap.isPositionInLayer(this.x, this.y, 'grass') : false;
        const distToTrought = trought ? Math.hypot(this.x - trought.x, this.y - trought.y) : Infinity;
        const inTrought = distToTrought < 50 && trought && trought.isTransformed;

        // 3. Consume resources (water, grass, trought)
        this.consumeResources(dt, world, inOasis, inMapWater, inMapGrass, inTrought, trought);

        // 4. Handle trought interaction
        this.handleTroughtInteraction(trought, inTrought);

        // 5. Movement
        const movement = this.updateMovement(dt, player, world, sheepList, trought);

        // 6. Animation
        const getWalkSequence = () => [0, 1, 2, 3, 2, 1];
        this.updateAnimation(dt, this.isEating, getWalkSequence);

        return null;
    }

    draw(ctx) {
        // Shadow (Rendered before sprite for natural layering)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 10, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Visual indicator for wool readiness
        if (this.woolGrowth >= 100) {
            ctx.shadowColor = "white";
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw Sprite
        let img = sheepImages[this.facing];
        let flip = false;

        if (this.isEating) {
            img = sheepImages.eat[this.animationFrame % 2];
            if (this.facing === 'left') flip = true;
        } else if (this.facing === 'left' || this.facing === 'right') {
            const walkSequence = [0, 1, 2, 3, 2, 1];
            img = sheepImages.walk[walkSequence[this.animationFrame % walkSequence.length]];
            if (this.facing === 'left') flip = true;
        }

        if (img && img.complete) {
            if (flip) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
                ctx.restore();
            } else {
                ctx.drawImage(img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            }
        } else {
            // Fallback if image not loaded yet
            drawEmoji(ctx, this.x, this.y, '🐑', 24);
        }

        ctx.shadowBlur = 0;

        // Draw status bars
        this.drawStatusBars(ctx);
    }

    serialize() {
        return {
            ...super.serialize(),
            woolGrowth: this.woolGrowth
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data) {
            this.woolGrowth = data.woolGrowth;
        }
    }
}
