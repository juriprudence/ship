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
        this.sprite.src = 'images/player.png';

        this.sprite2 = new Image();
        this.sprite2.src = 'images/player2.png';

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

            // Animation logic
            this.animationTimer += dt;
            if (this.animationTimer > 0.2) { // Toggle every 0.2s
                this.animationFrame = (this.animationFrame + 1) % 2;
                this.animationTimer = 0;

                // Play footstep sound on frame toggle
                if (soundManager) {
                    soundManager.playFootstep();
                }
            }
        } else {
            this.isMoving = false;
            this.animationFrame = 0; // Reset to standing frame
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

        switch (this.direction) {
            case 0: col = 0; row = 0; break; // Back
            case 1: col = 1; row = 0; break; // Front
            case 2: col = 1; row = 1; break; // Left (Swapped)
            case 3: col = 0; row = 1; break; // Right (Swapped)
        }

        const screenHeight = 80;
        const scale = screenHeight / this.frameHeight;
        const screenWidth = this.frameWidth * scale;

        let yOffset = 25;
        if (this.direction === 2 || this.direction === 3) {
            yOffset = 40; // Push down further for side views
        }

        if (this.sprite.complete && this.sprite2.complete) {
            const currentSprite = this.animationFrame === 0 ? this.sprite : this.sprite2;

            ctx.drawImage(
                currentSprite,
                col * this.frameWidth, row * this.frameHeight,
                this.frameWidth, this.frameHeight,
                this.x - screenWidth / 2, this.y - screenHeight + yOffset, // Anchor at feet
                screenWidth, screenHeight
            );
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
