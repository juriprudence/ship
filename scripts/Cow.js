import { drawEmoji } from './Utils.js';
import { Animal } from './Animal.js';

const cowImages = {
    down: new Image(),
    up: new Image(),
    left: new Image(),
    right: new Image(),
    anim1: new Image(),
    anim2: new Image(),
    anim3: new Image()
};

let cowImagesLoaded = false;
function loadCowImages(assets) {
    if (cowImagesLoaded) return;
    if (assets) {
        cowImages.down = assets.getAsset('images', 'images/cow/down.png');
        cowImages.up = assets.getAsset('images', 'images/cow/up.png');
        cowImages.right = assets.getAsset('images', 'images/cow/right.png');
        cowImages.left = assets.getAsset('images', 'images/cow/left.png');
        cowImages.anim1 = assets.getAsset('images', 'images/cow/cow_animation/1.png');
        cowImages.anim2 = assets.getAsset('images', 'images/cow/cow_animation/2.png');
        cowImages.anim3 = assets.getAsset('images', 'images/cow/cow_animation/3.png');
    } else {
        cowImages.down.src = 'images/cow/down.png';
        cowImages.up.src = 'images/cow/up.png';
        cowImages.right.src = 'images/cow/right.png';
        cowImages.left.src = 'images/cow/left.png';
        cowImages.anim1.src = 'images/cow/cow_animation/1.png';
        cowImages.anim2.src = 'images/cow/cow_animation/2.png';
        cowImages.anim3.src = 'images/cow/cow_animation/3.png';
    }
    cowImagesLoaded = true;
}

export class Cow extends Animal {
    constructor(x, y, assets) {
        super(x, y);
        loadCowImages(assets);
        this.color = '#8B4513'; // Brown cow color
        this.milkProduction = 0; // 0 to 100
        
        // Override dimensions for cow (larger than sheep)
        this.width = 100;
        this.height = 100;
    }

    update(dt, player, world, cowList, trought) {
        // 1. Milk Production
        if (this.milkProduction < 100) this.milkProduction += dt * 5;

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
        this.updateMovement(dt, player, world, cowList, trought);

        // 6. Animation
        const getWalkSequence = () => [0, 1, 2, 1];
        this.updateAnimation(dt, this.isEating, getWalkSequence);

        return null;
    }

    draw(ctx) {
        // Shadow (Rendered before sprite for natural layering)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 12, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Visual indicator for milk readiness
        if (this.milkProduction >= 100) {
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 10;
        } else {
            ctx.shadowBlur = 0;
        }

        // Draw Sprite
        let img;
        let flip = false;
        const walkSequence = [0, 1, 2, 1];

        // Use animation frames when moving horizontally, otherwise use directional sprites
        if (this.isMoving && (this.facing === 'left' || this.facing === 'right')) {
            // Use walking animation frames for left/right movement
            const frameIndex = walkSequence[this.animationFrame % walkSequence.length];
            if (frameIndex === 0) img = cowImages.anim1;
            else if (frameIndex === 1) img = cowImages.anim2;
            else img = cowImages.anim3;
            
            if (this.facing === 'left') {
                flip = true;
            }
        } else if (this.isMoving && this.facing === 'up') {
            // When moving up: use up.png sprite
            img = cowImages.up;
        } else if (this.isMoving && this.facing === 'down') {
            // When moving down: use down.png sprite
            img = cowImages.down;
        } else if (this.isEating) {
            // Use down sprite when eating/drinking
            img = cowImages.down;
        } else {
            // Use directional sprites when idle
            img = cowImages[this.facing];
            if (this.facing === 'left') {
                flip = true;
            }
        }

        if (img && img.complete && img.naturalWidth > 0) {
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
            drawEmoji(ctx, this.x, this.y, '🐄', 40);
        }

        ctx.shadowBlur = 0;

        // Draw status bars
        this.drawStatusBars(ctx);
    }

    serialize() {
        return {
            ...super.serialize(),
            milkProduction: this.milkProduction
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data) {
            this.milkProduction = data.milkProduction;
        }
    }
}
