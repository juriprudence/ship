export class TileMap {
    constructor(mapData, tilesetImage) {
        this.mapData = mapData;
        this.tilesetImage = tilesetImage;
        this.baseTileSize = mapData.tileSize;
        this.drawScale = 4; // Default scale
        this.centerX = 0;   // Offset to center the map
        this.centerY = 0;
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

        return layer.tiles.some(tile => tile.x === tileX && tile.y === tileY);
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

    isCollision(worldX, worldY) {
        return this.isPositionInLayer(worldX, worldY, 'montnghe');
    }

    draw(ctx, camera) {
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

        for (let i = this.mapData.layers.length - 1; i >= 0; i--) {
            const layer = this.mapData.layers[i];
            if (!layer.tiles) continue;

            layer.tiles.forEach(tile => {
                const id = parseInt(tile.id);
                const destX = startX + tile.x * scaledTileSize;
                const destY = startY + tile.y * scaledTileSize;

                // Simple camera culling
                if (destX + scaledTileSize < camera.x || destX > camera.x + ctx.canvas.width ||
                    destY + scaledTileSize < camera.y || destY > camera.y + ctx.canvas.height) {
                    return;
                }

                const srcX = (id % columns) * this.baseTileSize;
                const srcY = Math.floor(id / columns) * this.baseTileSize;

                ctx.drawImage(
                    this.tilesetImage,
                    srcX, srcY, this.baseTileSize, this.baseTileSize,
                    destX, destY, scaledTileSize, scaledTileSize
                );
            });
        }
        ctx.imageSmoothingEnabled = originalSmoothing;
    }
}
