import { drawEmoji } from './Utils.js';

export class Player {
    constructor(assets) {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.speed = 150;
        this.radius = 12;
        this.isMoving = false;
        this.actionRange = 60;

        if (assets) {
            this.sprite = assets.getAsset('images', 'images/newplayer/player1.png');
            this.sprite2 = assets.getAsset('images', 'images/newplayer/player2.png');
            this.shearingSprite = assets.getAsset('images', 'images/playercis.png');
            this.shearingSprite2 = assets.getAsset('images', 'images/playercis2.png');
            this.shearingSprite2 = assets.getAsset('images', 'images/playercis2.png');
            this.attackSprite = assets.getAsset('images', 'images/newplayer/playerhitow.png');
            this.attackSprite2 = assets.getAsset('images', 'images/newplayer/playerhitone.png');
        } else {
            this.sprite = new Image();
            this.sprite.src = 'images/newplayer/player1.png';

            this.sprite2 = new Image();
            this.sprite2.src = 'images/newplayer/player2.png';

            this.shearingSprite = new Image();
            this.shearingSprite.src = 'images/playercis.png';

            this.shearingSprite2 = new Image();
            this.shearingSprite2.src = 'images/playercis2.png';

            this.shearingSprite2 = new Image();
            this.shearingSprite2.src = 'images/playercis2.png';

            this.attackSprite = new Image();
            this.attackSprite.src = 'images/newplayer/playerhitow.png';

            this.attackSprite2 = new Image(); // Frame 2 source if needed, but we'll use one sheet
            this.attackSprite2.src = 'images/newplayer/playerhitone.png';
        }

        this.isShearing = false;
        this.shearingFrame = 0; // 0 or 1 for shearing animation

        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackFrame = 0;

        this.animationTimer = 0;
        this.animationFrame = 0; // 0 or 1

        // Sprite dimensions
        this.frameWidth = 204;
        this.frameHeight = 306;

        // 0: Back (Up), 1: Front (Down), 2: Left, 3: Right
        this.direction = 1;

        this.vx = 0;
        this.vy = 0;
        this.acceleration = 1200;
        this.friction = 0.85;

        this.onFootstep = null;
        this.bobOffset = 0;
        this.bobTimer = 0;
    }

    attack() {
        this.isAttacking = true;
        this.attackTimer = 0;
        this.attackFrame = 1; // Start at frame 2 (index 1)
        this.attackDurationTotal = 0;
        this.isMoving = false; // Stop moving when attacking
    }

    update(dt, soundManager, world, animalList) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let inputMoveX = 0;
        let inputMoveY = 0;

        if (dist > 5) {
            inputMoveX = (dx / dist);
            inputMoveY = (dy / dist);

            // Determine direction
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 3 : 2; // Right : Left
            } else {
                this.direction = dy > 0 ? 1 : 0; // Down : Up
            }
        } else {
            this.isMoving = false;
        }

        // Apply acceleration
        if (this.isMoving) {
            this.vx += inputMoveX * this.acceleration * dt;
            this.vy += inputMoveY * this.acceleration * dt;
        }

        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;

        // Cap speed
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > this.speed) {
            const ratio = this.speed / currentSpeed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        let finalMoveX = this.vx * dt;
        let finalMoveY = this.vy * dt;

        // --- Animal Collision ---
        if (animalList) {
            animalList.forEach(animal => {
                const d = Math.hypot(this.x - animal.x, this.y - animal.y);
                const minDistance = (20 + animal.width) * 0.4;

                if (d < minDistance) {
                    const pushAngle = Math.atan2(this.y - animal.y, this.x - animal.x);
                    const pushForce = (minDistance - d) / minDistance * 10;
                    this.vx += Math.cos(pushAngle) * pushForce * 10;
                    this.vy += Math.sin(pushAngle) * pushForce * 10;
                }
            });
        }

        // Apply final movement
        if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
            const nextX = this.x + this.vx * dt;
            const nextY = this.y + this.vy * dt;

            // Map Collision
            if (world && world.tileMap && world.tileMap.isCollision(nextX, nextY)) {
                this.isMoving = false;
                this.targetX = this.x;
                this.targetY = this.y;
                this.vx = 0;
                this.vy = 0;
            } else {
                this.x = nextX;
                this.y = nextY;
            }
        }


        // Animation logic
        this.animationTimer += dt;

        if (this.isAttacking) {
            this.animationTimer += dt;
            this.attackDurationTotal += dt;

            if (this.animationTimer > 0.1) {
                // Sequence 2, 3, 4 (indices 1, 2, 3)
                this.attackFrame++;
                if (this.attackFrame > 3) this.attackFrame = 1;
                this.animationTimer = 0;
            }

            if (this.attackDurationTotal > 0.4) {
                this.isAttacking = false;
                this.attackDurationTotal = 0;
            }
            return;
        }

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

                if (this.onFootstep) {
                    this.onFootstep(this.x, this.y);
                }
            }
        } else {
            this.animationFrame = 0;
            this.animationTimer = 0;
        }

        // Bobbing logic
        if (this.isMoving) {
            this.bobTimer += dt * 10;
            this.bobOffset = Math.sin(this.bobTimer) * 4;
        } else {
            this.bobOffset *= 0.8; // Smooth settle
            if (Math.abs(this.bobOffset) < 0.1) this.bobOffset = 0;
            this.bobTimer = 0;
        }
    }

    handleInput(clickX, clickY) {
        this.targetX = clickX;
        this.targetY = clickY;
        this.isMoving = true;
    }

    draw(ctx, time) {
        // Shadow
        const shadowScale = 1 + (this.bobOffset / 20); // Scale slightly with bob
        const shadowAlpha = 0.3 - (this.bobOffset / 100); // Fade slightly when higher
        ctx.fillStyle = `rgba(0,0,0,${Math.max(0.1, shadowAlpha)})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 12, 10 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
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
        let currentSprite = this.animationFrame === 0 ? this.sprite : this.sprite2;

        // Default dimensions
        let currentFrameWidth = this.frameWidth;
        let currentFrameHeight = this.frameHeight;

        if (this.isAttacking && this.attackSprite.complete) {
            currentSprite = this.attackSprite;
            currentFrameWidth = 250;
            currentFrameHeight = 250;
            col = this.attackFrame % 2;
            row = Math.floor(this.attackFrame / 2);
            if (this.direction === 2) flipHorizontal = true;
        } else if (this.isShearing && (this.shearingSprite.complete || this.shearingSprite2.complete)) {
            currentSprite = (this.shearingFrame === 0 && this.shearingSprite.complete) ? this.shearingSprite : this.shearingSprite2;
            currentFrameWidth = 500;
            currentFrameHeight = 500;
            col = 0;
            row = 0;
            if (this.direction === 2) flipHorizontal = true;
        } else {
            // Normal walking sprite handling
            switch (this.direction) {
                case 0: col = 0; row = 0; break; // Back
                case 1: col = 1; row = 0; break; // Front
                case 2: col = 0; row = 1; flipHorizontal = true; break; // Left
                case 3: col = 0; row = 1; break; // Right
            }
        }

        let screenHeight = 80; // Base height
        if ((this.isShearing || this.isAttacking) && currentSprite.complete) {
            screenHeight = 60; // Slightly smaller/different for these actions
        }

        const scale = screenHeight / currentFrameHeight;
        const screenWidth = currentFrameWidth * scale;

        let yOffset = 25;
        if (this.direction === 2 || this.direction === 3) {
            yOffset = 40;
        }

        if (this.isShearing || this.isAttacking) {
            yOffset = 25;
        }

        // Center override for different aspect ratio
        // If square (500x500), height=80 -> width=80.
        // Original was width ~53.

        if (currentSprite.complete) {
            ctx.save();
            const drawY = this.y - screenHeight + yOffset + this.bobOffset;
            if (flipHorizontal) {
                ctx.translate(this.x, drawY);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    currentSprite,
                    col * currentFrameWidth, row * currentFrameHeight,
                    currentFrameWidth, currentFrameHeight,
                    -screenWidth / 2, 0,
                    screenWidth, screenHeight
                );
            } else {
                ctx.drawImage(
                    currentSprite,
                    col * currentFrameWidth, row * currentFrameHeight,
                    currentFrameWidth, currentFrameHeight,
                    this.x - screenWidth / 2, drawY,
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
    serialize() {
        return {
            x: this.x,
            y: this.y,
            speed: this.speed,
            direction: this.direction
        };
    }

    deserialize(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.targetX = data.x;
        this.targetY = data.y;
        this.speed = data.speed || 150;
        this.direction = data.direction || 1;
        this.isMoving = false;
    }
}
