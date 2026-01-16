import { drawEmoji } from './Utils.js';
import { TileMap } from './TileMap.js';

export class World {
    constructor(assets) {
        this.oasis = { x: 400, y: 300, radius: 100 };
        this.tent = { x: -300, y: -200, radius: 60, width: 120, height: 100 };

        this.palms = [];
        this.cacti = [];

        // Use preloaded assets if available
        if (assets) {
            this.tileset = assets.getAsset('images', 'scripts/maps/spritesheet.png');
            const data = assets.getAsset('json', 'scripts/maps/map.json');
            if (data && this.tileset) {
                this.tileMap = new TileMap(data, this.tileset);
                this.tileMap.setScale(3);
                this.tileMap.setCenter(400, 300);
            } else {
                console.warn('Preloaded assets for map not found. Falling back to direct load.');
                this.loadMapDirectly();
            }
        } else {
            // Load Map (Fallback)
            this.loadMapDirectly();
        }

        this.initDecor();
    }

    loadMapDirectly() {
        this.tileset = new Image();
        this.tileset.src = 'scripts/maps/spritesheet.png';

        this.tileMap = null;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'scripts/maps/map.json', true);
        xhr.responseType = 'json';

        xhr.onload = () => {
            if (xhr.status === 200 || (xhr.status === 0 && xhr.response)) {
                this.tileMap = new TileMap(xhr.response, this.tileset);
                this.tileMap.setScale(3);
                this.tileMap.setCenter(400, 300);
            } else {
                console.error('Failed to load map directly:', xhr.status);
            }
        };

        xhr.onerror = () => {
            console.error('Network error loading map directly');
        };

        xhr.send();
    }

    initDecor() {
        // Palms around oasis
        for (let i = 0; i < 8; i++) {
            this.palms.push({
                x: this.oasis.x + (Math.random() * 180 - 90),
                y: this.oasis.y + (Math.random() * 180 - 90) - 30,
                scale: 0.8 + Math.random() * 0.4
            });
        }
        // Cacti scattered
        for (let i = 0; i < 15; i++) {
            this.cacti.push({
                x: (Math.random() * 2000 - 1000),
                y: (Math.random() * 2000 - 1000),
                type: Math.random() > 0.5 ? 1 : 2
            });
        }
    }

    update(dt, playerX, playerY, day) {
        if (this.tileMap) {
            this.tileMap.update(dt);
        }
        return { respawned: false };
    }

    draw(ctx, camera, canvasWidth, canvasHeight, time = 0, playerPos = null) {
        // Draw TileMap if loaded
        if (this.tileMap) {
            this.tileMap.draw(ctx, camera, time, playerPos);
        } else {
            // Fallback Grid pattern if map not loaded yet
            ctx.strokeStyle = 'rgba(180, 140, 80, 0.2)';
            ctx.lineWidth = 2;
            const gridSize = 100;
            const startX = Math.floor(camera.x / gridSize) * gridSize;
            const startY = Math.floor(camera.y / gridSize) * gridSize;

            ctx.beginPath();
            for (let x = startX; x < camera.x + canvasWidth; x += gridSize) {
                for (let y = startY; y < camera.y + canvasHeight; y += gridSize) {
                    // Random speckles
                    if ((x + y) % 300 === 0) {
                        ctx.fillStyle = 'rgba(160, 120, 70, 0.3)';
                        ctx.fillRect(x + 20, y + 20, 10, 5);
                    }
                }
            }
            ctx.stroke();
        }

        // Draw Oasis


        // Palms


        // Tent

        // Cacti

    }
}
