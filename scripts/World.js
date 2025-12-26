import { drawEmoji } from './Utils.js';
import { TileMap } from './TileMap.js';


export class World {
    constructor() {
        this.oasis = { x: 400, y: 300, radius: 100 };
        this.tent = { x: -300, y: -200, radius: 60, width: 120, height: 100 };



        this.palms = [];
        this.cacti = [];

        // Load Map
        this.tileset = new Image();
        this.tileset.src = 'scripts/maps/spritesheet.png';

        this.tileMap = null;
        fetch('scripts/maps/map.json')
            .then(response => response.json())
            .then(data => {
                this.tileMap = new TileMap(data, this.tileset);
                // Scale it up significantly to cover the world (128x128 tiles)
                // 17 * 128 = 2176px wide, which is about the world size.
                this.tileMap.setScale(3);
                this.tileMap.setCenter(400, 300); // Center around the oasis area
            })
            .catch(err => console.error('Failed to load map:', err));

        this.initDecor();
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
        return { respawned: false };
    }

    draw(ctx, camera, canvasWidth, canvasHeight) {
        // Draw TileMap if loaded
        if (this.tileMap) {
            this.tileMap.draw(ctx, camera);
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
        ctx.fillStyle = '#4fa4b8'; // Water blue
        ctx.beginPath();
        ctx.arc(this.oasis.x, this.oasis.y, this.oasis.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c2b280';
        ctx.lineWidth = 10;
        ctx.stroke();



        // Palms
        this.palms.forEach(p => {
            drawEmoji(ctx, p.x, p.y, '🌴', 40 * p.scale);
        });

        // Tent
        drawEmoji(ctx, this.tent.x, this.tent.y, '⛺', 80);

        // Cacti
        this.cacti.forEach(c => {
            drawEmoji(ctx, c.x, c.y, '🌵', 30);
        });
    }
}
