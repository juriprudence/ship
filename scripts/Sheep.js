import { drawEmoji } from './Utils.js';

const sheepImages = {
    down: new Image(),
    up: new Image(),
    left: new Image(),
    right: new Image()
};
sheepImages.down.src = 'images/sheep/down.png';
sheepImages.up.src = 'images/sheep/up.png';
sheepImages.left.src = 'images/sheep/left.png';
sheepImages.right.src = 'images/sheep/right.png';

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
        this.facing = 'down';

        // Dimensions for the sprite
        this.width = 80;
        this.height = 80;

        // Hysteresis for direction switching
        this.lastFacingTime = 0;
        this.isUsingTrought = false;
        this.isEating = false;
    }

    update(dt, player, world, sheepList, trought) {
        // 1. Wool Growth
        if (this.woolGrowth < 100) this.woolGrowth += dt * 5;

        // 2. Thirst & Hunger
        this.thirst += dt * 1.0;
        this.hunger += dt * 0.75;
        if (this.thirst > 120) this.thirst = 120;
        if (this.hunger > 120) this.hunger = 120;

        this.isEating = false; // Reset each frame

        // Check Death
        if (this.thirst > 100 || this.hunger > 100) {
            return { died: true, cause: this.thirst > 100 ? "العطش" : "الجوع" };
        }

        // --- Interactions ---
        // Find nearest grassland
        let nearestGrass = null;
        let minDistToGrass = Infinity;
        world.grasslands.forEach(g => {
            if (g.isExpired) return;
            const d = Math.hypot(this.x - g.x, this.y - g.y);
            if (d < minDistToGrass) {
                minDistToGrass = d;
                nearestGrass = g;
            }
        });

        const inGrassland = nearestGrass ? nearestGrass.checkBounds(this.x, this.y) : false;

        const distToOasis = Math.hypot(this.x - world.oasis.x, this.y - world.oasis.y);
        const inOasis = distToOasis < world.oasis.radius;

        const distToTrought = trought ? Math.hypot(this.x - trought.x, this.y - trought.y) : Infinity;
        const inTrought = distToTrought < 50 && trought && trought.isTransformed;

        if (inOasis) {
            this.thirst -= dt * 30;
            if (this.thirst < 0) this.thirst = 0;
        }

        if (inGrassland && nearestGrass) {
            const consumed = nearestGrass.consume(dt * 8); // Slightly decreased rate as requested
            if (consumed > 0) {
                this.hunger -= dt * 25;
                if (this.hunger < 0) this.hunger = 0;
                this.isEating = true;
            }
        }

        if (inTrought) {
            if (!this.isUsingTrought) {
                this.isUsingTrought = trought.reserveSlot();
            }

            if (this.isUsingTrought) {
                // Eating AND Drinking - ONLY if slot reserved
                this.thirst -= dt * 40;
                this.hunger -= dt * 35;
                if (this.thirst < 0) this.thirst = 0;
                if (this.hunger < 0) this.hunger = 0;

                // Release slot if no longer needed
                if (this.thirst === 0 && this.hunger === 0) {
                    trought.releaseSlot();
                    this.isUsingTrought = false;
                }
            }
        } else if (this.isUsingTrought) {
            // Sheep was using it but moved away or it expired
            trought.releaseSlot();
            this.isUsingTrought = false;
        }

        // Reset if trought is gone
        if (this.isUsingTrought && (!trought || !trought.isTransformed || trought.isExpired)) {
            this.isUsingTrought = false;
        }

        // --- Movement Logic ---
        let moveX = 0;
        let moveY = 0;
        let speed = 40;
        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);


        const perceptionRadius = 400;

        // Trought Priority
        if (this.isUsingTrought && inTrought) {
            // Stay at the trought while using it
            const angle = Math.atan2(trought.y - this.y, trought.x - this.x);
            moveX = Math.cos(angle) * 0.2;
            moveY = Math.sin(angle) * 0.2;
            speed = 20;
        } else if (trought && trought.isTransformed && !trought.isExpired && (this.thirst > 50 || this.hunger > 50) && !inTrought && (trought.currentUsers < trought.maxUsers || this.isUsingTrought)) {
            const angle = Math.atan2(trought.y - this.y, trought.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            speed = 70;
        } else if (this.isUsingTrought) {
            // If somehow using it but none of the above (shouldn't happen but for safety)
            speed = 0;
        } else if (this.thirst > 70 && !inOasis && distToOasis < perceptionRadius) {
            const angle = Math.atan2(world.oasis.y - this.y, world.oasis.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            speed = 60;
        } else if (this.hunger > 70 && nearestGrass && !inGrassland && minDistToGrass < perceptionRadius) {
            const angle = Math.atan2(nearestGrass.y - this.y, nearestGrass.x - this.x);
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

        // Update facing direction with hysteresis
        // Only change direction if enough time has passed (e.g., 500ms) or if the movement is significant
        if (Date.now() - this.lastFacingTime > 500) {
            if (Math.abs(moveX) > Math.abs(moveY)) {
                if (moveX > 0) {
                    if (this.facing !== 'right') {
                        this.facing = 'right';
                        this.lastFacingTime = Date.now();
                    }
                }
                else if (moveX < 0) {
                    if (this.facing !== 'left') {
                        this.facing = 'left';
                        this.lastFacingTime = Date.now();
                    }
                }
            } else {
                if (moveY > 0) {
                    if (this.facing !== 'down') {
                        this.facing = 'down';
                        this.lastFacingTime = Date.now();
                    }
                }
                else if (moveY < 0) {
                    if (this.facing !== 'up') {
                        this.facing = 'up';
                        this.lastFacingTime = Date.now();
                    }
                }
            }
        }

        this.x += moveX * speed * dt;
        this.y += moveY * speed * dt;

        return null;
    }

    isVisible(camera, canvasWidth, canvasHeight) {
        const margin = 50; // Buffer
        return (
            this.x >= camera.x - margin &&
            this.x <= camera.x + canvasWidth + margin &&
            this.y >= camera.y - margin &&
            this.y <= camera.y + canvasHeight + margin
        );
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
        const img = sheepImages[this.facing];
        if (img && img.complete) {
            ctx.drawImage(img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            // Fallback if image not loaded yet
            drawEmoji(ctx, this.x, this.y, '🐑', 24);
        }

        ctx.shadowBlur = 0;

        // Thirst meter
        if (this.thirst > 50) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 45, 20, 4);
            ctx.fillStyle = this.thirst > 80 ? 'red' : '#4fa4b8';
            const thirstW = (1 - (this.thirst / 100)) * 20;
            ctx.fillRect(this.x - 10, this.y - 45, Math.max(0, thirstW), 4);
        }

        // Hunger meter
        if (this.hunger > 50) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x - 10, this.y - 52, 20, 4);
            ctx.fillStyle = this.hunger > 80 ? 'red' : '#a0522d';
            const hungerW = (1 - (this.hunger / 100)) * 20;
            ctx.fillRect(this.x - 10, this.y - 52, Math.max(0, hungerW), 4);
        }
    }
}
