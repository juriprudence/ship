import { drawEmoji } from './Utils.js';

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

export class Sheep {
    constructor(x, y, assets) {
        loadSheepImages(assets);
        this.x = x;
        this.y = y;
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

        // Animation state
        this.animationTimer = 0;
        this.animationFrame = 0;

        this.wolfHits = 0; // Hits taken from wolf
        this.isMoving = false;
    }

    update(dt, player, world, sheepList, trought) {
        // 1. Wool Growth
        if (this.woolGrowth < 100) this.woolGrowth += dt * 5;

        // 2. Thirst & Hunger
        this.thirst += dt * 0.5;
        this.hunger += dt * 0.5;
        if (this.thirst > 120) this.thirst = 120;
        if (this.hunger > 120) this.hunger = 120;

        this.isEating = false; // Reset each frame

        // Check Death
        if (this.thirst > 100 || this.hunger > 100) {
            return { died: true, cause: this.thirst > 100 ? "العطش" : "الجوع" };
        }

        // --- Interactions ---

        const distToOasis = Math.hypot(this.x - world.oasis.x, this.y - world.oasis.y);
        const inOasis = distToOasis < world.oasis.radius;

        const inMapWater = world.tileMap ? world.tileMap.isPositionInLayer(this.x, this.y, 'water') : false;
        const inMapGrass = world.tileMap ? world.tileMap.isPositionInLayer(this.x, this.y, 'grass') : false;

        const distToTrought = trought ? Math.hypot(this.x - trought.x, this.y - trought.y) : Infinity;
        const inTrought = distToTrought < 50 && trought && trought.isTransformed;

        if (inOasis || inMapWater) {
            this.thirst -= dt * 30;
            if (this.thirst < 0) this.thirst = 0;
            this.isEating = true; // Use head-down animation for drinking
        }



        if (inMapGrass) {
            this.hunger -= dt * 25;
            if (this.hunger < 0) this.hunger = 0;
            this.isEating = true;

            // Start consuming the grass tile
            if (world.tileMap) {
                const tile = world.tileMap.getTileAt(this.x, this.y, 'grass');
                if (tile) {
                    world.tileMap.startConsuming('grass', tile.x, tile.y, 60.0); // 60 seconds of eating before it disappears
                }
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
                this.isEating = true; // Use head-down animation

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
        if (this.isBeingSheared) {
            speed = 0;
            moveX = 0;
            moveY = 0;
            // Ensure it faces player or stays as is? Stays as is is fine.
        } else if (this.isUsingTrought && inTrought) {
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
        } else if (this.thirst > 70 && !inOasis && !inMapWater) {
            // Find nearest water source
            let targetWater = null;
            let bestWaterDist = Infinity;

            // Check Oasis
            if (distToOasis < perceptionRadius) {
                targetWater = { x: world.oasis.x, y: world.oasis.y };
                bestWaterDist = distToOasis;
            }

            // Check Map Water
            if (world.tileMap) {
                const nearestTile = world.tileMap.getNearestTileInLayer(this.x, this.y, 'water');
                if (nearestTile) {
                    const distToTile = Math.hypot(this.x - nearestTile.x, this.y - nearestTile.y);
                    if (distToTile < perceptionRadius && distToTile < bestWaterDist) {
                        targetWater = nearestTile;
                        bestWaterDist = distToTile;
                    }
                }
            }

            if (targetWater) {
                const angle = Math.atan2(targetWater.y - this.y, targetWater.x - this.x);
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
                speed = 60;
            }
        } else if (this.hunger > 70 && !inMapGrass) {
            // Find nearest food source
            let targetFood = null;
            let bestFoodDist = Infinity;



            // Check Map Grass
            if (world.tileMap) {
                const nearestTile = world.tileMap.getNearestTileInLayer(this.x, this.y, 'grass');
                if (nearestTile) {
                    const distToTile = Math.hypot(this.x - nearestTile.x, this.y - nearestTile.y);
                    if (distToTile < perceptionRadius && distToTile < bestFoodDist) {
                        targetFood = nearestTile;
                        bestFoodDist = distToTile;
                    }
                }
            }

            if (targetFood) {
                const angle = Math.atan2(targetFood.y - this.y, targetFood.x - this.x);
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
                speed = 60;
            }
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

        const nextX = this.x + moveX * speed * dt;
        const nextY = this.y + moveY * speed * dt;

        if (world && world.tileMap && world.tileMap.isCollision(nextX, nextY)) {
            // Blocked, maybe change wander angle for better AI feel
            if (Math.random() < 0.1) this.wanderAngle = Math.random() * Math.PI * 2;
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        // Update animation
        this.isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1;

        if (this.isEating) {
            this.animationTimer += dt * 5; // Eating animation speed
            if (this.animationTimer > 0.5) {
                this.animationFrame = (this.animationFrame + 1) % 2; // 2 frames for eating
                this.animationTimer = 0;
            }
        } else if (this.isMoving) {
            const walkSequence = [0, 1, 2, 3, 2, 1]; // Ping-pong with 4 frames
            this.animationTimer += dt * 6;
            if (this.animationTimer > 0.8) {
                this.animationFrame = (this.animationFrame + 1) % walkSequence.length;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0;
            this.animationTimer = 0;
        }

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
        let img = sheepImages[this.facing];
        let flip = false;

        if (this.isEating) {
            img = sheepImages.eat[this.animationFrame % 2];
            // Potentially flip if we want it to maintain its last horizontal facing?
            // Usually eating sprites are head-down, so horizontal facing matters less but flip might be needed if they are asymmetric.
            if (this.facing === 'left') flip = true;
        } else if (this.facing === 'left' || this.facing === 'right') {
            const walkSequence = [0, 1, 2, 3, 2, 1]; // Match the sequence from update()
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
    serialize() {
        return {
            x: this.x,
            y: this.y,
            woolGrowth: this.woolGrowth,
            thirst: this.thirst,
            hunger: this.hunger,
            wolfHits: this.wolfHits,
            facing: this.facing
        };
    }

    deserialize(data) {
        if (!data) return;
        this.x = data.x;
        this.y = data.y;
        this.woolGrowth = data.woolGrowth;
        this.thirst = data.thirst;
        this.hunger = data.hunger;
        this.wolfHits = data.wolfHits || 0;
        this.facing = data.facing || 'down';
    }
}
