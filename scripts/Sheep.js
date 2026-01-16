import { drawEmoji } from './Utils.js';
import { Animal } from './Animal.js';

const sheepImages = {
    spritesheet: new Image(),
    eatingSpritesheet: new Image(), // New 4x4 eating animation
    die: [new Image(), new Image(), new Image(), new Image()], // 4 frames for death animation/stages
    heart: new Image() // New dead sheep sprite
};

let sheepImagesLoaded = false;
function loadSheepImages(assets) {
    if (sheepImagesLoaded) return;
    if (assets) {
        sheepImages.spritesheet = assets.getAsset('images', 'images/sheep/sheepw.png');
        sheepImages.eatingSpritesheet = assets.getAsset('images', 'images/sheep/sheep.png');
        sheepImages.die[0] = assets.getAsset('images', 'images/sheep/sheep_die/1.png');
        sheepImages.die[1] = assets.getAsset('images', 'images/sheep/sheep_die/2.png');
        sheepImages.die[2] = assets.getAsset('images', 'images/sheep/sheep_die/3.png');
        sheepImages.die[3] = assets.getAsset('images', 'images/sheep/sheep_die/4.png');
        sheepImages.heart = assets.getAsset('images', 'images/heart_sheep.png');
    } else {
        sheepImages.spritesheet.src = 'images/sheep/sheepw.png';
        sheepImages.eatingSpritesheet.src = 'images/sheep/sheep.png';
        sheepImages.die[0].src = 'images/sheep/sheep_die/1.png';
        sheepImages.die[1].src = 'images/sheep/sheep_die/2.png';
        sheepImages.die[2].src = 'images/sheep/sheep_die/3.png';
        sheepImages.die[3].src = 'images/sheep/sheep_die/4.png';
        sheepImages.heart.src = 'images/heart_sheep.png';
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
        this.width = 50;
        this.height = 50;

        this.lifeState = 'alive'; // 'alive' or 'dying'
        this.deathStage = 0; // 0 to 3
        this.isGolden = false;
    }


    die() {
        if (this.lifeState === 'dying') return;
        this.lifeState = 'dying';
        this.deathStage = 0;
        this.state = 'idle';
        this.isMoving = false;
        this.isEating = false;
    }

    update(dt, player, world, sheepList, trought) {
        if (this.lifeState === 'dying') {
            if (this.deathStage >= 4) {
                return { finished: true };
            }
            return null;
        }

        // 1. Wool Growth
        if (this.woolGrowth < 100) {
            this.woolGrowth += dt * 5;
            if (this.woolGrowth >= 100) {
                // 10% chance to become golden when wool is fully grown
                this.isGolden = Math.random() < 0.1;
            }
        }


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
        const movement = !this.isBeingSheared ? this.updateMovement(dt, player, world, sheepList, trought) : { moveX: 0, moveY: 0, speed: 0 };

        // 6. Animation
        const getWalkSequence = () => [0, 1, 2, 3, 2, 1];
        this.updateAnimation(dt, this.isEating, getWalkSequence);

        return null;
    }

    draw(ctx) {
        ctx.save();
        // Shadow (Rendered before sprite for natural layering)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Darkened for better visibility
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 10, 15, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.lifeState === 'dying') {
            const img = sheepImages.heart;
            if (img && img.complete) {
                // Determine frame dimensions (4x4 grid)
                const frameW = img.naturalWidth / 4;
                const frameH = img.naturalHeight / 4;

                // Draw first frame (0,0)
                ctx.drawImage(
                    img,
                    0, 0, frameW, frameH,
                    this.x - this.width / 2, this.y - this.height / 2, this.width, this.height
                );
            }
            ctx.restore();
            return;
        }

        // Visual indicator for wool readiness
        if (this.woolGrowth >= 100) {
            if (this.isGolden) {
                ctx.shadowColor = "#ffd700";
                ctx.shadowBlur = 20;
                // Add sparkle particles occasionally
                if (Math.random() < 0.1) {
                    this.triggerSparkle = true;
                }
            } else {
                ctx.shadowColor = "white";
                ctx.shadowBlur = 10;
            }
        } else {
            ctx.shadowBlur = 0;
        }


        // Draw Sprite
        let img = null;
        let flip = false;
        let useSpritesheet = false;

        if (this.isEating) {
            img = sheepImages.eatingSpritesheet;
            useSpritesheet = true;
        } else {
            img = sheepImages.spritesheet;
            useSpritesheet = true;
        }

        if (img && img.complete && (useSpritesheet || img.naturalWidth > 0)) {
            if (this.isEating && img === sheepImages.eatingSpritesheet) {
                // New Eating Animation Logic (4x4 Grid)
                // Cols: 0=Up, 1=Left, 2=Right, 3=Down
                // Rows: 4 frames of animation

                const frameW = img.naturalWidth / 4;
                const frameH = img.naturalHeight / 4;

                let col = 3; // Default to Down
                if (this.facing === 'up') col = 0;
                else if (this.facing === 'left') col = 1;
                else if (this.facing === 'right') col = 2;
                else col = 3; // down

                // Cycle through 4 frames (rows)
                // Frame is calculated in updateAnimation
                const eatFrame = this.animationFrame;

                ctx.drawImage(
                    img,
                    col * frameW, eatFrame * frameH, frameW, frameH,
                    this.x - this.width / 2, this.y - this.height / 2, this.width, this.height
                );

            } else if (useSpritesheet) {
                const frameW = img.naturalWidth / 4;
                const frameH = img.naturalHeight / 4;

                let row = 0;
                if (this.facing === 'left') row = 1;
                else if (this.facing === 'right') row = 2;
                else if (this.facing === 'up') row = 3;
                else row = 0; // down

                const walkSequence = [0, 1, 2, 3, 2, 1];
                const frameIndex = this.isMoving ? walkSequence[this.animationFrame % walkSequence.length] : 0;

                ctx.drawImage(
                    img,
                    frameIndex * frameW, row * frameH, frameW, frameH,
                    this.x - this.width / 2, this.y - this.height / 2, this.width, this.height
                );
            } else {
                if (flip) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
                }
            }
        } else {
            // Fallback if image not loaded yet
            drawEmoji(ctx, this.x, this.y, '🐑', 24);
        }

        ctx.shadowBlur = 0;

        // Draw status bars
        this.drawStatusBars(ctx);
        ctx.restore();
    }

    updateAnimation(dt, isEating, getWalkSequence) {
        if (isEating) {
            if (!this.wasEating) {
                this.animationTimer = 0;
                this.animationFrame = 0;
            }
            this.wasEating = true;

            this.animationTimer += dt;
            // Play at 5fps (0.2s per frame), clamp to frame 3
            this.animationFrame = Math.min(3, Math.floor(this.animationTimer / 0.2));
        } else {
            this.wasEating = false;
            super.updateAnimation(dt, isEating, getWalkSequence);
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            woolGrowth: this.woolGrowth,
            lifeState: this.lifeState,
            deathStage: this.deathStage,
            isGolden: this.isGolden
        };

    }

    deserialize(data) {
        super.deserialize(data);
        if (data) {
            this.woolGrowth = data.woolGrowth;
            this.lifeState = data.lifeState || 'alive';
            this.deathStage = data.deathStage || 0;
            this.isGolden = data.isGolden || false;
        }

    }
}
