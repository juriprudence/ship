import { drawEmoji } from './Utils.js';
import { Grassland } from './Grassland.js';

export class World {
    constructor() {
        this.oasis = { x: 400, y: 300, radius: 100 };
        this.tent = { x: -300, y: -200, radius: 60, width: 120, height: 100 };

        // Multiple Grassland patches
        this.grasslands = [];
        for (let i = 0; i < 7; i++) {
            // Initial distribution around the starting area
            const angle = (i / 7) * Math.PI * 2;
            const dist = 400 + Math.random() * 300;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            this.grasslands.push(new Grassland(x, y));
        }

        this.palms = [];
        this.cacti = [];

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
        let anyRespawned = false;
        this.grasslands.forEach(g => {
            if (g.update(dt, playerX, playerY, day)) {
                anyRespawned = true;
            }
        });
        return { respawned: anyRespawned };
    }

    draw(ctx, camera, canvasWidth, canvasHeight) {
        // Grid pattern for sand
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

        // Draw Oasis
        ctx.fillStyle = '#4fa4b8'; // Water blue
        ctx.beginPath();
        ctx.arc(this.oasis.x, this.oasis.y, this.oasis.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c2b280';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Draw Grasslands
        this.grasslands.forEach(g => g.draw(ctx));

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
