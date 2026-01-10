export class Animal {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.thirst = 0; // 0 to 120
        this.hunger = 0; // 0 to 120
        this.state = 'idle';
        this.id = Math.random();
        this.wanderAngle = 0;
        this.facing = 'down';

        // Dimensions - to be overridden by subclasses
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

    updateCore(dt) {
        // Thirst & Hunger
        this.thirst += dt * 0.5;
        this.hunger += dt * 0.5;
        if (this.thirst > 120) this.thirst = 120;
        if (this.hunger > 120) this.hunger = 120;

        this.isEating = false; // Reset each frame

        // Check Death
        if (this.thirst > 100 || this.hunger > 100) {
            return { died: true, cause: this.thirst > 100 ? "thirst" : "hunger" };
        }
        return null;
    }

    updateMovement(dt, player, world, animalList, trought, perceptionRadius = 400) {
        let moveX = 0;
        let moveY = 0;
        let speed = 40;
        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);

        // --- Trought Priority ---
        if (this.isUsingTrought && trought && inTroughtArea(this, trought)) {
            // Stay at the trought while using it
            const angle = Math.atan2(trought.y - this.y, trought.x - this.x);
            moveX = Math.cos(angle) * 0.2;
            moveY = Math.sin(angle) * 0.2;
            speed = 20;
        } else if (trought && trought.isTransformed && !trought.isExpired &&
            (this.thirst > 50 || this.hunger > 50) && !inTroughtArea(this, trought) &&
            (trought.currentUsers < trought.maxUsers || this.isUsingTrought)) {
            const angle = Math.atan2(trought.y - this.y, trought.x - this.x);
            moveX = Math.cos(angle);
            moveY = Math.sin(angle);
            speed = 70;
        } else if (this.isUsingTrought) {
            // If somehow using it but none of the above
            speed = 0;
        } else if (this.thirst > 70 && !inWater(this, world)) {
            // Find nearest water source
            const targetWater = findNearestWater(this, world, perceptionRadius);
            if (targetWater) {
                const angle = Math.atan2(targetWater.y - this.y, targetWater.x - this.x);
                moveX = Math.cos(angle);
                moveY = Math.sin(angle);
                speed = 60;
            }
        } else if (this.hunger > 70 && !inGrass(this, world)) {
            // Find nearest food source
            const targetFood = findNearestFood(this, world, perceptionRadius);
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

        // Separation from other animals
        animalList.forEach(other => {
            if (this === other) return;
            const d = Math.hypot(this.x - other.x, this.y - other.y);
            if (d < 20) {
                const pushAngle = Math.atan2(this.y - other.y, this.x - other.x);
                moveX += Math.cos(pushAngle) * 2;
                moveY += Math.sin(pushAngle) * 2;
            }
        });

        // Update facing direction with hysteresis
        if (Date.now() - this.lastFacingTime > 500) {
            if (Math.abs(moveX) > Math.abs(moveY)) {
                if (moveX > 0) {
                    if (this.facing !== 'right') {
                        this.facing = 'right';
                        this.lastFacingTime = Date.now();
                    }
                } else if (moveX < 0) {
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
                } else if (moveY < 0) {
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
            if (Math.random() < 0.1) this.wanderAngle = Math.random() * Math.PI * 2;
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        this.isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1;

        return { moveX, moveY, speed };
    }

    updateAnimation(dt, isEating, getWalkSequence) {
        if (isEating) {
            this.animationTimer += dt * 5;
            if (this.animationTimer > 0.5) {
                this.animationFrame = (this.animationFrame + 1) % 2;
                this.animationTimer = 0;
            }
        } else if (this.isMoving) {
            const walkSequence = getWalkSequence();
            this.animationTimer += dt * 6;
            if (this.animationTimer > 0.8) {
                this.animationFrame = (this.animationFrame + 1) % walkSequence.length;
                this.animationTimer = 0;
            }
        } else {
            this.animationFrame = 0;
            this.animationTimer = 0;
        }
    }

    handleTroughtInteraction(trought, inTrought) {
        if (inTrought) {
            if (!this.isUsingTrought) {
                this.isUsingTrought = trought.reserveSlot();
            }

            if (this.isUsingTrought) {
                // Release slot if no longer needed
                if (this.thirst === 0 && this.hunger === 0) {
                    trought.releaseSlot();
                    this.isUsingTrought = false;
                }
            }
        } else if (this.isUsingTrought) {
            trought.releaseSlot();
            this.isUsingTrought = false;
        }

        // Reset if trought is gone
        if (this.isUsingTrought && (!trought || !trought.isTransformed || trought.isExpired)) {
            this.isUsingTrought = false;
        }
    }

    consumeResources(dt, world, inOasis, inMapWater, inMapGrass, inTrought, trought) {
        if (inOasis || inMapWater) {
            this.thirst -= dt * 30;
            if (this.thirst < 0) this.thirst = 0;
            this.isEating = true;
        }

        if (inMapGrass) {
            this.hunger -= dt * 25;
            if (this.hunger < 0) this.hunger = 0;
            this.isEating = true;

            if (world.tileMap) {
                const tile = world.tileMap.getTileAt(this.x, this.y, 'grass');
                if (tile) {
                    world.tileMap.startConsuming('grass', tile.x, tile.y, 60.0);
                }
            }
        }

        if (inTrought && this.isUsingTrought) {
            this.thirst -= dt * 40;
            this.hunger -= dt * 35;
            if (this.thirst < 0) this.thirst = 0;
            if (this.hunger < 0) this.hunger = 0;
            this.isEating = true;
        }
    }

    isVisible(camera, canvasWidth, canvasHeight) {
        const margin = 50;
        return (
            this.x >= camera.x - margin &&
            this.x <= camera.x + canvasWidth + margin &&
            this.y >= camera.y - margin &&
            this.y <= camera.y + canvasHeight + margin
        );
    }

    drawStatusBars(ctx) {
        // Thirst meter
        if (this.thirst > 50) {
            const barWidth = this.width * 0.5;
            const barHeight = 4;
            const x = this.x - barWidth / 2;
            const y = this.y - this.height / 2 - 15;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = this.thirst > 80 ? 'red' : '#4fa4b8';
            const thirstW = (1 - (this.thirst / 100)) * barWidth;
            ctx.fillRect(x, y, Math.max(0, thirstW), barHeight);
        }

        // Hunger meter
        if (this.hunger > 50) {
            const barWidth = this.width * 0.5;
            const barHeight = 4;
            const x = this.x - barWidth / 2;
            const y = this.y - this.height / 2 - 22;

            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = this.hunger > 80 ? 'red' : '#a0522d';
            const hungerW = (1 - (this.hunger / 100)) * barWidth;
            ctx.fillRect(x, y, Math.max(0, hungerW), barHeight);
        }
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
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
        this.thirst = data.thirst;
        this.hunger = data.hunger;
        this.wolfHits = data.wolfHits || 0;
        this.facing = data.facing || 'down';
    }
}

// Helper functions
function inTroughtArea(animal, trought) {
    if (!trought) return false;
    const dist = Math.hypot(animal.x - trought.x, animal.y - trought.y);
    return dist < 50 && trought.isTransformed;
}

function inWater(animal, world) {
    const distToOasis = Math.hypot(animal.x - world.oasis.x, animal.y - world.oasis.y);
    const inOasis = distToOasis < world.oasis.radius;
    const inMapWater = world.tileMap ? world.tileMap.isPositionInLayer(animal.x, animal.y, 'water') : false;
    return inOasis || inMapWater;
}

function inGrass(animal, world) {
    return world.tileMap ? world.tileMap.isPositionInLayer(animal.x, animal.y, 'grass') : false;
}

function findNearestWater(animal, world, perceptionRadius) {
    const distToOasis = Math.hypot(animal.x - world.oasis.x, animal.y - world.oasis.y);
    let targetWater = null;
    let bestWaterDist = Infinity;

    if (distToOasis < perceptionRadius) {
        targetWater = { x: world.oasis.x, y: world.oasis.y };
        bestWaterDist = distToOasis;
    }

    if (world.tileMap) {
        const nearestTile = world.tileMap.getNearestTileInLayer(animal.x, animal.y, 'water');
        if (nearestTile) {
            const distToTile = Math.hypot(animal.x - nearestTile.x, animal.y - nearestTile.y);
            if (distToTile < perceptionRadius && distToTile < bestWaterDist) {
                targetWater = nearestTile;
                bestWaterDist = distToTile;
            }
        }
    }

    return targetWater;
}

function findNearestFood(animal, world, perceptionRadius) {
    if (!world.tileMap) return null;

    const nearestTile = world.tileMap.getNearestTileInLayer(animal.x, animal.y, 'grass');
    if (nearestTile) {
        const distToTile = Math.hypot(animal.x - nearestTile.x, animal.y - nearestTile.y);
        if (distToTile < perceptionRadius) {
            return nearestTile;
        }
    }
    return null;
}
