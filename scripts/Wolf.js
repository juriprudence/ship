export class Wolf {
    constructor() {
        this.x = (Math.random() * 2000 - 1000);
        this.y = (Math.random() * 2000 - 1000);

        this.frames = [new Image(), new Image()];
        this.frames[0].src = 'images/wolf1.png';
        this.frames[1].src = 'images/wolf2.png';

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
    }

    flee(sourceX, sourceY) {
        this.state = 'flee';
        this.fleeTimer = 2.0; // Flee for 2 seconds
        this.fleeSource = { x: sourceX, y: sourceY };
    }

    update(dt, sheepList, world) {
        if (sheepList.length === 0) return;

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

        let moveX = 0;
        let moveY = 0;
        let currentSpeed = this.speed;

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
        } else if (isIsolated) {
            this.state = 'attack';
            this.targetSheep = nearestSheep;
            const angle = Math.atan2(nearestSheep.y - this.y, nearestSheep.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            currentSpeed = 80;

            if (minDist < 30) {
                // Kill logic
                const index = sheepList.indexOf(nearestSheep);
                if (index > -1) {
                    sheepList.splice(index, 1);
                    return { kill: true, message: "the wolf eat the sheep" };
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

        // Update facing
        this.facing = Math.abs(moveX) > Math.abs(moveY) ? (moveX > 0 ? 'right' : 'left') : (moveY > 0 ? 'down' : 'up');

        // Collision check
        const nextX = this.x + moveX * currentSpeed * dt;
        const nextY = this.y + moveY * currentSpeed * dt;

        if (world.tileMap && world.tileMap.isCollision(nextX, nextY)) {
            // Simple bounce/stop
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        // Animation
        this.animationTimer += dt * (this.state === 'attack' ? 10 : 5);
        if (this.animationTimer > 1) {
            this.animationFrame = (this.animationFrame + 1) % 2;
            this.animationTimer = 0;
        }

        return null;
    }

    draw(ctx) {
        const img = this.frames[this.animationFrame];
        if (!img.complete) return;

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
}
