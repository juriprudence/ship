export class Wolf {
    constructor(assets, startX, startY) {
        this.x = startX ?? (Math.random() * 2000 - 1000);
        this.y = startY ?? (Math.random() * 2000 - 1000);

        if (assets) {
            this.frames = [
                assets.getAsset('images', 'images/wolf1.png'),
                assets.getAsset('images', 'images/wolf2.png')
            ];
        } else {
            this.frames = [new Image(), new Image()];
            this.frames[0].src = 'images/wolf1.png';
            this.frames[1].src = 'images/wolf2.png';
        }

        this.width = 40; // even smaller!
        this.height = 40;
        this.spriteSize = 500; // Original sprite size in the sheet

        this.facing = 'down';
        this.speed = 30;
        this.state = 'follow'; // 'follow' or 'attack'

        this.animationTimer = 0;
        this.animationFrame = 0;

        this.targetSheep = null;
        this.health = 2;
        this.fleeTimer = 0;
        this.fleeSource = { x: 0, y: 0 };
        this.attackCooldown = 0;
    }

    flee(sourceX, sourceY) {
        this.state = 'flee';
        this.fleeTimer = 2.0; // Flee for 2 seconds
        this.fleeSource = { x: sourceX, y: sourceY };
    }

    update(dt, sheepList, world, wolfList, player, fireList) {
        if (sheepList.length === 0) return;

        // Fire Avoidance
        let nearestFire = null;
        let distToFire = Infinity;
        if (fireList && fireList.length > 0) {
            fireList.forEach(f => {
                const d = Math.hypot(this.x - f.x, this.y - f.y);
                if (d < distToFire) {
                    distToFire = d;
                    nearestFire = f;
                }
            });
        }

        if (nearestFire && distToFire < 400) { // Repel radius
            // Strong push away from fire
            const angle = Math.atan2(this.y - nearestFire.y, this.x - nearestFire.x);
            this.x += Math.cos(angle) * this.speed * 4 * dt;
            this.y += Math.sin(angle) * this.speed * 4 * dt;

            // Also force state change to flee if very close
            if (this.state !== 'flee' && distToFire < 250) {
                this.state = 'flee';
                this.fleeTimer = 1.0;
                this.fleeSource = { x: nearestFire.x, y: nearestFire.y };
            }

            // If we are being pushed, we skip the rest of the movement logic for this frame to avoid conflicts
            // But we still want animation update.
            this.animationTimer += dt * 5;
            if (this.animationTimer > 1) {
                this.animationFrame = (this.animationFrame + 1) % 2;
                this.animationTimer = 0;
            }
            return null;
        }

        // Pack Detection
        let nearbyWolves = 0;
        wolfList.forEach(w => {
            if (w === this) return;
            const d = Math.hypot(this.x - w.x, this.y - w.y);
            if (d < 300) nearbyWolves++;
        });
        const inPack = (nearbyWolves >= 2); // 3 wolves including self

        // Player Distance Check
        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        const playerIsNear = distToPlayer < 250;

        // Find nearest sheep
        let nearestSheep = null;
        let minDist = Infinity;

        sheepList.forEach(s => {
            const d = Math.hypot(this.x - s.x, this.y - s.y);
            if (d < minDist) {
                minDist = d;
                nearestSheep = s;
            }
        });

        if (!nearestSheep) return;

        // Check isolation
        let othersNearTarget = 0;
        sheepList.forEach(s => {
            if (s === nearestSheep) return;
            const d = Math.hypot(nearestSheep.x - s.x, nearestSheep.y - s.y);
            if (d < 400) othersNearTarget++;
        });

        const isIsolated = othersNearTarget === 0;

        // Decision Logic
        let moveX = 0;
        let moveY = 0;
        let currentSpeed = this.speed;

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Flee from player if alone
        if (playerIsNear && !inPack && this.state !== 'flee') {
            this.flee(player.x, player.y);
        }

        // --- Search for nearby carcass if not currently attacking or fleeing ---
        if (this.state !== 'flee' && this.state !== 'attack' && this.state !== 'eating') {
            let nearestCarcass = null;
            let minCarcassDist = Infinity;
            sheepList.forEach(s => {
                if (s.lifeState === 'dying' && s.deathStage < 4) {
                    const d = Math.hypot(this.x - s.x, this.y - s.y);
                    if (d < 500 && d < minCarcassDist) {
                        minCarcassDist = d;
                        nearestCarcass = s;
                    }
                }
            });

            if (nearestCarcass) {
                this.state = 'eating';
                this.targetSheep = nearestCarcass;
            }
        }

        if (this.state === 'flee') {
            this.fleeTimer -= dt;
            if (this.fleeTimer <= 0) {
                this.state = 'follow';
            } else {
                const angle = Math.atan2(this.y - this.fleeSource.y, this.x - this.fleeSource.x);
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
                currentSpeed = 150; // Run away fast
            }
        } else if (this.state === 'eating') {
            if (!this.targetSheep || this.targetSheep.lifeState !== 'dying' || this.targetSheep.deathStage >= 4) {
                this.state = 'follow';
                this.targetSheep = null;
            } else {
                const distToCarcass = Math.hypot(this.x - this.targetSheep.x, this.y - this.targetSheep.y);
                if (distToCarcass > 10) {
                    const angle = Math.atan2(this.targetSheep.y - this.y, this.targetSheep.x - this.x);
                    moveX = Math.cos(angle);
                    moveY = Math.sin(angle);
                    currentSpeed = 50;
                } else {
                    // Arrived at carcass
                    moveX = 0;
                    moveY = 0;
                    this.targetSheep.deathStage += dt * 0.08; // Eat the sheep over ~50 seconds (4 stages)
                }
            }
        } else if (isIsolated || inPack) {
            this.state = 'attack';
            this.targetSheep = nearestSheep;
            const angle = Math.atan2(nearestSheep.y - this.y, nearestSheep.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            currentSpeed = 80;

            if (minDist < 30 && this.attackCooldown <= 0) {
                // Bite/Attack logic
                nearestSheep.wolfHits++;
                this.attackCooldown = 0.8; // Time between bites

                // Notify world through Game.js return
                if (nearestSheep.wolfHits >= 5) {
                    nearestSheep.die();
                    this.state = 'eating';
                    this.targetSheep = nearestSheep;
                    return { kill: true, message: "wolfEatSheep" };
                } else {
                    return { hit: true };
                }
            }
        } else {
            this.state = 'follow';
            this.targetSheep = null;
            const angle = Math.atan2(nearestSheep.y - this.y, nearestSheep.x - this.x);

            if (minDist > 400) {
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
            } else if (minDist < 300) {
                moveX = -Math.cos(angle);
                moveY = -Math.sin(angle);
            } else {
                // Just wander a bit around the sheep
                if (Math.random() < 0.05) this.wanderAngle = (Math.random() - 0.5) * 2;
                moveX = Math.cos(angle + (this.wanderAngle || 0));
                moveY = Math.sin(angle + (this.wanderAngle || 0));
                currentSpeed = 20;
            }
        }

        // Wolf Collision (Separation)
        wolfList.forEach(w => {
            if (w === this) return;
            const d = Math.hypot(this.x - w.x, this.y - w.y);
            // Wolf width is 40. Collision radius ~30.
            const minDistance = (this.width + w.width) * 0.4;

            if (d < minDistance) {
                const pushAngle = Math.atan2(this.y - w.y, this.x - w.x);
                // Push force
                const pushForce = (minDistance - d) / minDistance * 5;
                moveX += Math.cos(pushAngle) * pushForce;
                moveY += Math.sin(pushAngle) * pushForce;
            }
        });

        // Smart Obstacle Avoidance (Steering)
        let finalMoveX = moveX;
        let finalMoveY = moveY;

        if (world.tileMap && world.tileMap.isCollision(this.x + moveX * currentSpeed * dt, this.y + moveY * currentSpeed * dt)) {
            const baseAngle = Math.atan2(moveY, moveX);
            // Try offsets: +/- 45 deg, +/- 90 deg, +/- 135 deg
            const testAngles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
            let foundPath = false;

            for (let offset of testAngles) {
                const angle = baseAngle + offset;
                const tx = Math.cos(angle);
                const ty = Math.sin(angle);
                if (!world.tileMap.isCollision(this.x + tx * currentSpeed * dt, this.y + ty * currentSpeed * dt)) {
                    finalMoveX = tx;
                    finalMoveY = ty;
                    foundPath = true;
                    break;
                }
            }

            if (!foundPath) {
                finalMoveX = 0;
                finalMoveY = 0;
            }
        }

        // Update facing based on final direction
        if (finalMoveX !== 0 || finalMoveY !== 0) {
            this.facing = Math.abs(finalMoveX) > Math.abs(finalMoveY) ? (finalMoveX > 0 ? 'right' : 'left') : (finalMoveY > 0 ? 'down' : 'up');
        }

        this.x += finalMoveX * currentSpeed * dt;
        this.y += finalMoveY * currentSpeed * dt;

        // Animation
        this.animationTimer += dt * (this.state === 'attack' ? 10 : 5);
        if (this.animationTimer > 1) {
            this.animationFrame = (this.animationFrame + 1) % 2;
            this.animationTimer = 0;
        }

        return null;
    }

    draw(ctx) {
        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 10, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        const img = this.frames[this.animationFrame];
        if (!img.complete) {
            ctx.restore();
            return;
        }

        // Sprite sheet (2x2)
        // Down: 0, 0
        // Left (Flipped Right): 250, 0 (flip = false)
        // Right: 250, 0 (flip = true)
        // Up: 250, 250
        let sx = 0, sy = 0;
        const sSize = 250;
        let flip = false;

        switch (this.facing) {
            case 'down': sx = 0; sy = 0; break;
            case 'left':
                sx = 250; sy = 0;
                flip = false;
                break;
            case 'right':
                sx = 250; sy = 0;
                flip = true;
                break;
            case 'up': sx = 250; sy = 250; break;
        }

        if (flip) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
                img,
                sx, sy, sSize, sSize,
                -this.width / 2, -this.height / 2, this.width, this.height
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                img,
                sx, sy, sSize, sSize,
                this.x - this.width / 2, this.y - this.height / 2, this.width, this.height
            );
        }
        ctx.restore();
    }

    isVisible(camera, canvasWidth, canvasHeight) {
        const margin = 100;
        return (
            this.x >= camera.x - margin &&
            this.x <= camera.x + canvasWidth + margin &&
            this.y >= camera.y - margin &&
            this.y <= camera.y + canvasHeight + margin
        );
    }
    serialize() {
        return {
            x: this.x,
            y: this.y,
            health: this.health,
            state: this.state,
            facing: this.facing
        };
    }

    deserialize(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.health = data.health ?? 2;
        this.state = data.state || 'follow';
        this.facing = data.facing || 'down';
    }
}
