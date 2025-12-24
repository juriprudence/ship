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

        this.sprite = new Image();
        this.sprite.src = 'images/newplayer/player1.png';

        this.sprite2 = new Image();
        this.sprite2.src = 'images/newplayer/player2.png';

        this.shearingSprite = new Image();
        this.shearingSprite.src = 'images/playercis.png';

        this.shearingSprite2 = new Image();
        this.shearingSprite2.src = 'images/playercis2.png';

        this.isShearing = false;
        this.shearingFrame = 0; // 0 or 1 for shearing animation

        this.animationTimer = 0;
        this.animationFrame = 0; // 0 or 1

        // Sprite dimensions
        this.frameWidth = 204;
        this.frameHeight = 306;

        // 0: Back (Up), 1: Front (Down), 2: Left, 3: Right
        this.direction = 1;
    }

    update(dt, soundManager) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const moveX = (dx / dist) * this.speed * dt;
            const moveY = (dy / dist) * this.speed * dt;
            this.x += moveX;
            this.y += moveY;
            this.isMoving = true;

            // Determine direction
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 3 : 2; // Right : Left
            } else {
                this.direction = dy > 0 ? 1 : 0; // Down : Up
            }
        } else {
            this.isMoving = false;
        }

        // Animation logic
        this.animationTimer += dt;

        if (this.isShearing) {
            if (this.animationTimer > 0.2) {
                this.shearingFrame = (this.shearingFrame + 1) % 2;
                this.animationTimer = 0;
                // Sound is now handled in Game.js state transitions
            }
        } else if (this.isMoving) {
            // Moving animation
            if (this.animationTimer > 0.2) { // Toggle every 0.2s
                this.animationFrame = (this.animationFrame + 1) % 2;
                this.animationTimer = 0;

                // Play footstep sound on frame toggle
                if (soundManager) {
                    soundManager.playFootstep();
                }
            }
        } else {
            this.animationFrame = 0;
            this.animationTimer = 0;
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

        // Sprite Drawing
        // Grid mapping:
        // Row 0: Back (0), Front (1)
        // Row 1: Left (2), Right (3) -- ASSUMPTION based on typical sheets, may need tweak
        // Actually looking at the image:
        // Top-Left: Back, Top-Right: Front
        // Bottom-Left: Left, Bottom-Right: Right

        let col = 0;
        let row = 0;
        let flipHorizontal = false;

        // Default dimensions
        let currentFrameWidth = this.frameWidth;
        let currentFrameHeight = this.frameHeight;

        if (this.isShearing && this.shearingSprite.complete) {
            // Shearing sprite overrides
            currentFrameWidth = 500;
            currentFrameHeight = 500;
            // Assume single frame, so col=0, row=0
            col = 0;
            row = 0;

            // Still respect direction for flipping if needed?
            // Let's assume the sprite faces right by default like the others?
            // Or if it's a single front-facing image, maybe we don't flip?
            // To be safe, let's flip for Left (Dir 2) just like normal walking
            if (this.direction === 2) flipHorizontal = true;

            // User requested 1/4 size
            // Normal screenHeight is 80. 1/4 is 20. But let's try 35 first as 20 is very small? 
            // "show it small 1/4" -> I'll try 30.
            // Wait, if I use 20 it might be what they asked.
            // Let's use a scale multiplier on the calculated screen dimensions.
        } else {
            // Normal sprite handling
            switch (this.direction) {
                case 0: col = 0; row = 0; break; // Back
                case 1: col = 1; row = 0; break; // Front
                case 2: col = 0; row = 1; flipHorizontal = true; break; // Left
                case 3: col = 0; row = 1; break; // Right
            }
        }

        let screenHeight = 80; // Base height

        if (this.isShearing && this.shearingSprite.complete) {
            // User requested bigger than 1/2 (was 40), let's try 60 (3/4)
            screenHeight = 60;
        }

        const scale = screenHeight / currentFrameHeight;
        const screenWidth = currentFrameWidth * scale;

        let yOffset = 25;
        if (this.direction === 2 || this.direction === 3) {
            yOffset = 40;
        }

        if (this.isShearing && this.shearingSprite.complete) {
            // Adjust offset for sprite size
            yOffset = 25;
        }

        // Center override for different aspect ratio
        // If square (500x500), height=80 -> width=80.
        // Original was width ~53.

        if (this.sprite.complete && this.sprite2.complete) {
            let currentSprite = this.animationFrame === 0 ? this.sprite : this.sprite2;

            if (this.isShearing) {
                // debug
                // console.log('DEBUG: Draw Shearing. Frame:', this.shearingFrame, 'Img1:', this.shearingSprite.complete, 'Img2:', this.shearingSprite2.complete);

                if (this.shearingFrame === 0 && this.shearingSprite.complete) {
                    currentSprite = this.shearingSprite;
                } else if (this.shearingFrame === 1 && this.shearingSprite2.complete) {
                    currentSprite = this.shearingSprite2;
                } else if (this.shearingSprite.complete) {
                    // Fallback to sprite 1 if sprite 2 not loaded
                    currentSprite = this.shearingSprite;
                }
            }

            ctx.save();

            if (flipHorizontal) {
                // Flip horizontally
                // Note: we need to adjust translation for correct pivoting
                ctx.translate(this.x + screenWidth / 2, this.y - screenHeight + yOffset);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    currentSprite,
                    col * currentFrameWidth, row * currentFrameHeight,
                    currentFrameWidth, currentFrameHeight,
                    0, 0,
                    screenWidth, screenHeight
                );
            } else {
                ctx.drawImage(
                    currentSprite,
                    col * currentFrameWidth, row * currentFrameHeight,
                    currentFrameWidth, currentFrameHeight,
                    this.x - screenWidth / 2, this.y - screenHeight + yOffset,
                    screenWidth, screenHeight
                );
            }

            ctx.restore();
        } else {
            // Fallback while loading
            drawEmoji(ctx, this.x, this.y, '👳', 32);
        }

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
