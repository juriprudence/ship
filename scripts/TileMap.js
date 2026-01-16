export class TileMap {
    constructor(mapData, tilesetImage) {
        this.mapData = mapData;
        this.tilesetImage = tilesetImage;
        this.baseTileSize = mapData.tileSize;
        this.drawScale = 4; // Default scale
        this.centerX = 0;   // Offset to center the map
        this.centerX = 0;   // Offset to center the map
        this.centerY = 0;

        // Track tiles being consumed (e.g. grass)
        this.consumedTiles = new Map(); // Key: "layerName:x,y", Value: remainingTime
        this.hiddenTiles = new Set();   // Key: "layerName:x,y"
    }

    addTile(layerName, tx, ty, id) {
        const layer = this.mapData.layers.find(l => l.name === layerName);
        if (!layer) return;

        // Ensure tiles array exists
        if (!layer.tiles) layer.tiles = [];

        // Remove from hidden if it was there (e.g. regrowing eaten grass)
        const key = `${layerName}:${tx},${ty}`;
        this.hiddenTiles.delete(key);
        this.consumedTiles.delete(key);

        // Find existing tile data at this pos
        const existingIndex = layer.tiles.findIndex(t => t.x === tx && t.y === ty);
        if (existingIndex !== -1) {
            layer.tiles[existingIndex].id = id.toString();
        } else {
            layer.tiles.push({ id: id.toString(), x: tx, y: ty });
        }
    }

    setScale(scale) {
        this.drawScale = scale;
    }

    setCenter(x, y) {
        this.centerX = x;
        this.centerY = y;
    }

    isPositionInLayer(worldX, worldY, layerName) {
        const scaledTileSize = this.baseTileSize * this.drawScale;
        const worldWidth = this.mapData.mapWidth * scaledTileSize;
        const worldHeight = this.mapData.mapHeight * scaledTileSize;
        const startX = this.centerX - worldWidth / 2;
        const startY = this.centerY - worldHeight / 2;

        const tileX = Math.floor((worldX - startX) / scaledTileSize);
        const tileY = Math.floor((worldY - startY) / scaledTileSize);

        if (tileX < 0 || tileX >= this.mapData.mapWidth || tileY < 0 || tileY >= this.mapData.mapHeight) {
            return false;
        }

        const layer = this.mapData.layers.find(l => l.name === layerName);
        if (!layer || !layer.tiles) return false;

        return layer.tiles.some(tile => {
            if (this.hiddenTiles.has(`${layerName}:${tile.x},${tile.y}`)) return false;
            return tile.x === tileX && tile.y === tileY;
        });
    }

    getTileAt(worldX, worldY, layerName) {
        const scaledTileSize = this.baseTileSize * this.drawScale;
        const worldWidth = this.mapData.mapWidth * scaledTileSize;
        const worldHeight = this.mapData.mapHeight * scaledTileSize;
        const startX = this.centerX - worldWidth / 2;
        const startY = this.centerY - worldHeight / 2;

        const tileX = Math.floor((worldX - startX) / scaledTileSize);
        const tileY = Math.floor((worldY - startY) / scaledTileSize);

        if (tileX < 0 || tileX >= this.mapData.mapWidth || tileY < 0 || tileY >= this.mapData.mapHeight) {
            return null;
        }

        const layer = this.mapData.layers.find(l => l.name === layerName);
        if (!layer || !layer.tiles) return null;

        const tile = layer.tiles.find(t => t.x === tileX && t.y === tileY);
        if (!tile || this.hiddenTiles.has(`${layerName}:${tileX},${tileY}`)) return null;

        return { x: tileX, y: tileY };
    }

    startConsuming(layerName, tx, ty, duration) {
        const key = `${layerName}:${tx},${ty}`;
        if (this.hiddenTiles.has(key)) return;
        if (!this.consumedTiles.has(key)) {
            this.consumedTiles.set(key, duration);
        }
    }

    update(dt) {
        for (let [key, time] of this.consumedTiles.entries()) {
            time -= dt;
            if (time <= 0) {
                this.consumedTiles.delete(key);
                this.hiddenTiles.add(key);
            } else {
                this.consumedTiles.set(key, time);
            }
        }
    }

    getNearestTileInLayer(worldX, worldY, layerName) {
        const scaledTileSize = this.baseTileSize * this.drawScale;
        const worldWidth = this.mapData.mapWidth * scaledTileSize;
        const worldHeight = this.mapData.mapHeight * scaledTileSize;
        const startX = this.centerX - worldWidth / 2;
        const startY = this.centerY - worldHeight / 2;

        const layer = this.mapData.layers.find(l => l.name === layerName);
        if (!layer || !layer.tiles) return null;

        let nearestTile = null;
        let minDistSq = Infinity;

        layer.tiles.forEach(tile => {
            const centerX = startX + tile.x * scaledTileSize + scaledTileSize / 2;
            const centerY = startY + tile.y * scaledTileSize + scaledTileSize / 2;
            const distSq = Math.pow(worldX - centerX, 2) + Math.pow(worldY - centerY, 2);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestTile = { x: centerX, y: centerY };
            }
        });

        return nearestTile;
    }

    getRandomSafePositionInLayer(targetLayerName, collisionLayerName) {
        const targetLayer = this.mapData.layers.find(l => l.name === targetLayerName);
        if (!targetLayer || !targetLayer.tiles || targetLayer.tiles.length === 0) return null;

        const collisionLayer = this.mapData.layers.find(l => l.name === collisionLayerName);
        const collisionSet = new Set();
        if (collisionLayer && collisionLayer.tiles) {
            collisionLayer.tiles.forEach(t => collisionSet.add(`${t.x},${t.y}`));
        }

        const safeTiles = targetLayer.tiles.filter(t => !collisionSet.has(`${t.x},${t.y}`));
        if (safeTiles.length === 0) return null;

        const tile = safeTiles[Math.floor(Math.random() * safeTiles.length)];

        const scaledTileSize = this.baseTileSize * this.drawScale;
        const worldWidth = this.mapData.mapWidth * scaledTileSize;
        const worldHeight = this.mapData.mapHeight * scaledTileSize;
        const startX = this.centerX - worldWidth / 2;
        const startY = this.centerY - worldHeight / 2;

        return {
            x: startX + tile.x * scaledTileSize + scaledTileSize / 2,
            y: startY + tile.y * scaledTileSize + scaledTileSize / 2
        };
    }

    isCollision(worldX, worldY) {
        return this.isPositionInLayer(worldX, worldY, 'montnghe');
    }

    draw(ctx, camera, time = 0, playerPos = null) {
        if (!this.tilesetImage.complete || this.tilesetImage.naturalWidth === 0) return;

        const columns = Math.floor(this.tilesetImage.width / this.baseTileSize);
        const scaledTileSize = this.baseTileSize * this.drawScale;

        // Calculate world top-left based on map dimensions and centering
        const worldWidth = this.mapData.mapWidth * scaledTileSize;
        const worldHeight = this.mapData.mapHeight * scaledTileSize;
        const startX = this.centerX - worldWidth / 2;
        const startY = this.centerY - worldHeight / 2;

        const originalSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;

        const grassLayers = ['grass', 'justgrass'];

        for (let i = this.mapData.layers.length - 1; i >= 0; i--) {
            const layer = this.mapData.layers[i];
            if (!layer.tiles) continue;

            const isGrassLayer = grassLayers.includes(layer.name);

            layer.tiles.forEach(tile => {
                const id = parseInt(tile.id);
                const destX = Math.floor(startX + tile.x * scaledTileSize);
                const destY = Math.floor(startY + tile.y * scaledTileSize);

                if (this.hiddenTiles.has(`${layer.name}:${tile.x},${tile.y}`)) return;

                // Simple camera culling
                if (destX + scaledTileSize < camera.x || destX > camera.x + ctx.canvas.width ||
                    destY + scaledTileSize < camera.y || destY > camera.y + ctx.canvas.height) {
                    return;
                }

                const srcX = (id % columns) * this.baseTileSize;
                const srcY = Math.floor(id / columns) * this.baseTileSize;

                if (isGrassLayer) {
                    ctx.save();

                    // Center of tile for rotation/skew logic
                    const centerX = destX + scaledTileSize / 2;
                    const centerY = destY + scaledTileSize; // Sway from bottom

                    // Wind sway (using sin wave)
                    const windSway = Math.sin(time * 2 + tile.x * 0.5 + tile.y * 0.3) * 0.1;

                    // Player interaction
                    let playerBending = 0;
                    if (playerPos) {
                        const dx = centerX - playerPos.x;
                        const dy = centerY - playerPos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const interactionRadius = 40;

                        if (dist < interactionRadius) {
                            // Push grass away from player
                            const strength = (1 - dist / interactionRadius) * 0.4;
                            playerBending = (dx > 0 ? strength : -strength);
                        }
                    }

                    const totalSway = windSway + playerBending;

                    // Apply skew transformation
                    ctx.translate(centerX, centerY);
                    ctx.transform(1, 0, totalSway, 1, 0, 0);
                    ctx.translate(-centerX, -centerY);

                    ctx.drawImage(
                        this.tilesetImage,
                        srcX, srcY, this.baseTileSize, this.baseTileSize,
                        destX, destY, scaledTileSize + 1, scaledTileSize + 1
                    );
                    ctx.restore();
                } else {
                    ctx.drawImage(
                        this.tilesetImage,
                        srcX, srcY, this.baseTileSize, this.baseTileSize,
                        destX, destY, scaledTileSize + 1, scaledTileSize + 1
                    );
                }
            });
        }
        ctx.imageSmoothingEnabled = originalSmoothing;
    }
    resetConsumedTiles() {
        this.consumedTiles.clear();
        this.hiddenTiles.clear();
    }

    serialize() {
        return {
            consumedTiles: Array.from(this.consumedTiles.entries()),
            hiddenTiles: Array.from(this.hiddenTiles)
        };
    }

    deserialize(data) {
        if (!data) return;
        if (data.consumedTiles) {
            this.consumedTiles = new Map(data.consumedTiles);
        }
        if (data.hiddenTiles) {
            this.hiddenTiles = new Set(data.hiddenTiles);
        }
    }
}
