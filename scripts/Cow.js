import { drawEmoji } from './Utils.js';
import { Animal } from './Animal.js';

const cowImages = {
    spritesheet: new Image(),
    headDown1: new Image(),
    headDown2: new Image(),
    milk1: new Image(),
    milk2: new Image(),
    milk3: new Image(),
    milk4: new Image()
};

let cowImagesLoaded = false;
function loadCowImages(assets) {
    if (cowImagesLoaded) return;
    if (assets) {
        cowImages.spritesheet = assets.getAsset('images', 'images/cow/cow_all.png');
        cowImages.headDown1 = assets.getAsset('images', 'images/cow/head_down/head_down.png');
        cowImages.headDown2 = assets.getAsset('images', 'images/cow/head_down/head_downt.png');
        cowImages.milk1 = assets.getAsset('images', 'images/cow/milk_cow/1.png');
        cowImages.milk2 = assets.getAsset('images', 'images/cow/milk_cow/2.png');
        cowImages.milk3 = assets.getAsset('images', 'images/cow/milk_cow/3.png');
        cowImages.milk4 = assets.getAsset('images', 'images/cow/milk_cow/4.png');
    } else {
        cowImages.spritesheet.src = 'images/cow/cow_all.png';
        cowImages.headDown1.src = 'images/cow/head_down/head_down.png';
        cowImages.headDown2.src = 'images/cow/head_down/head_downt.png';
        cowImages.milk1.src = 'images/cow/milk_cow/1.png';
        cowImages.milk2.src = 'images/cow/milk_cow/2.png';
        cowImages.milk3.src = 'images/cow/milk_cow/3.png';
        cowImages.milk4.src = 'images/cow/milk_cow/4.png';
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
        this.width = 60;
        this.height = 60;

        // Auto milking state
        this.autoMilkingStage = 0; // 0: idle, 1: milking (1-2 loop), 2: finishing (3-4 once)
        this.milkingTimer = 0;
    }

    update(dt, player, world, cowList, trought) {
        // 1. Milk Production
        if (this.milkProduction < 100) this.milkProduction += dt * 5;

        // 2. Core animal needs (thirst, hunger, death check)
        const deathResult = this.updateCore(dt);
        if (deathResult) {
            // Ensure tent occupancy is reset if cow dies while milking
            if ((this.autoMilkingStage === 1 || this.autoMilkingStage === 2) && window.game) {
                window.game.isTentOccupied = false;
                if (window.game.soundManager) window.game.soundManager.stopMilkingSound();
            }
            return deathResult;
        }

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

        // 5. Movement & Auto-Milking
        if (this.autoMilkingStage === 0) {
            // Check if in tent for automatic milking
            const inTent = this.milkProduction >= 100 && world.tileMap && world.tileMap.isPositionInLayer(this.x, this.y, 'justtent');

            if (inTent) {
                // If tent is occupied, wait (stop moving)
                if (window.game && window.game.isTentOccupied) {
                    this.isMoving = false;
                } else {
                    // Start milking
                    this.autoMilkingStage = 1;
                    this.milkingTimer = 0;
                    if (window.game) {
                        window.game.isTentOccupied = true;
                        if (window.game.soundManager) window.game.soundManager.startMilkingSound();
                    }
                }
            } else {
                this.updateMovement(dt, player, world, cowList, trought);
            }
        } else if (this.autoMilkingStage === 1) {
            // Milking stage (loop 1-2)
            this.milkingTimer += dt;
            if (this.milkingTimer > 3) { // 3 seconds of milking
                this.autoMilkingStage = 2;
                this.milkingTimer = 0;
                this.milkProduction = 0;
                // Signal reward
                if (window.game) {
                    window.game.gameState.gold += 15;
                    window.game.showNotification(window.game.t('cowMilkedAuto'));
                    window.game.updateUI();
                    if (window.game.soundManager) window.game.soundManager.stopMilkingSound();
                }
            }
        } else if (this.autoMilkingStage === 2) {
            // Finishing stage (3-4 once)
            this.milkingTimer += dt;
            if (this.milkingTimer > 1.5) { // 1.5 seconds for finish animation
                this.autoMilkingStage = 0;
                this.milkingTimer = 0;
                if (window.game) window.game.isTentOccupied = false;
            }
        }

        // 6. Animation
        const getWalkSequence = () => [0, 1, 2, 3];
        this.updateAnimation(dt, this.isEating, getWalkSequence);

        return null;
    }

    draw(ctx) {
        ctx.save();
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

        // Milking animation
        if (this.autoMilkingStage === 1) {
            // Milking animation (1-2 loop)
            const stage1Sequence = [1, 2];
            const frameIndex = Math.floor(Date.now() / 250) % 2; // Simple time-based toggle
            img = stage1Sequence[frameIndex] === 1 ? cowImages.milk1 : cowImages.milk2;
        } else if (this.autoMilkingStage === 2) {
            // Finishing animation (3-4 sequence)
            const stage2Sequence = [3, 4];
            const frameIndex = Math.min(1, Math.floor(this.milkingTimer / 0.75));
            img = stage2Sequence[frameIndex] === 3 ? cowImages.milk3 : cowImages.milk4;
        } else if (this.isEating) {
            // Animation for eating/drinking
            const eatSequence = [0, 1];
            const frameIndex = eatSequence[this.animationFrame % eatSequence.length];
            img = frameIndex === 0 ? cowImages.headDown1 : cowImages.headDown2;

            if (this.facing === 'left') {
                flip = true;
            }
        } else {
            // Walking Animation using cow_all sprite sheet (1024x1024, 4x4)
            img = cowImages.spritesheet;

            if (img && img.complete && img.naturalWidth > 0) {
                const frameW = img.naturalWidth / 4;
                const frameH = img.naturalHeight / 4;

                let row = 0;
                // Rows: 0=Down, 1=Left, 2=Right, 3=Up
                if (this.facing === 'down') row = 0;
                else if (this.facing === 'left') row = 1;
                else if (this.facing === 'right') row = 2;
                else if (this.facing === 'up') row = 3;

                // Animation frame (0-3)
                // If not moving, stay on first frame or maybe frame 0
                const col = this.isMoving ? (this.animationFrame % 4) : 0;

                ctx.drawImage(
                    img,
                    col * frameW, row * frameH, frameW, frameH,
                    this.x - this.width / 2, this.y - this.height / 2, this.width, this.height
                );

                // Return early since we drew the sprite here
                ctx.shadowBlur = 0;
                this.drawStatusBars(ctx);
                ctx.restore();
                return;
            }
        }

        // Fallback for non-walking (milking/eating) or if sprite sheet not loaded
        if (img && img.complete && img.naturalWidth > 0) {
            // Adjust drawing size for eating animation to match visual scale
            let drawWidth = this.width;
            let drawHeight = this.height;

            if (this.isEating) {
                drawWidth = 100;
                drawHeight = 100;
            }

            if (flip) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                ctx.restore();
            } else {
                ctx.drawImage(img, this.x - drawWidth / 2, this.y - drawHeight / 2, drawWidth, drawHeight);
            }
        } else {
            // Fallback if image not loaded yet
            drawEmoji(ctx, this.x, this.y, '🐄', 40);
        }

        ctx.shadowBlur = 0;

        // Draw status bars
        this.drawStatusBars(ctx);
        ctx.restore();
    }

    serialize() {
        return {
            ...super.serialize(),
            milkProduction: this.milkProduction,
            autoMilkingStage: this.autoMilkingStage
        };
    }

    deserialize(data) {
        super.deserialize(data);
        if (data) {
            this.milkProduction = data.milkProduction;
            // Best to reset milking stage on load to avoid global flag drift
            this.autoMilkingStage = 0;
            this.milkingTimer = 0;
        }
    }
}
