import { Player } from './Player.js';
import { World } from './World.js';
import { Sheep } from './Sheep.js';
import { Particle, Ripple } from './Utils.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.gameState = {
            gold: 0,
            woolCount: 0,
            day: 1,
            time: 0,
            gameActive: true,
            lastTime: 0
        };

        this.camera = { x: 0, y: 0 };
        this.player = new Player();
        this.world = new World();
        this.sheepList = [];
        this.MAX_SHEEP = 50;

        this.particles = [];
        this.ripples = [];

        this.bindMethods();
    }

    bindMethods() {
        this.resize = this.resize.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.buySheep = this.buySheep.bind(this);
        this.upgradeSpeed = this.upgradeSpeed.bind(this);
        this.restartGame = this.restartGame.bind(this); // Bind restart logic
    }

    init() {
        this.resize();
        window.addEventListener('resize', this.resize);
        this.canvas.addEventListener('pointerdown', this.handleInput);

        // Bind UI buttons
        document.getElementById('buy-sheep-btn').addEventListener('click', this.buySheep);
        document.getElementById('upgrade-speed-btn').addEventListener('click', this.upgradeSpeed);

        // Initial Spawn
        for (let i = 0; i < 20; i++) this.spawnSheep();

        requestAnimationFrame(this.gameLoop);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnSheep() {
        if (this.sheepList.length >= this.MAX_SHEEP) return;
        this.sheepList.push(new Sheep(this.player.x, this.player.y));
        this.updateUI();
    }

    handleInput(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        let clickedSheep = false;
        for (let s of this.sheepList) {
            const dx = s.x - clickX;
            const dy = s.y - clickY;
            if (dx * dx + dy * dy < 900) {
                if (s.woolGrowth >= 100) {
                    this.shearSheep(s);
                    clickedSheep = true;
                    // Visual feedback
                    this.createParticleVFX(s.x, s.y, '#fff', 10);
                } else {
                    // Nudge
                    s.x += (Math.random() - 0.5) * 20;
                    s.y += (Math.random() - 0.5) * 20;
                }
            }
        }

        if (!clickedSheep) {
            this.player.handleInput(clickX, clickY);
            this.createRippleVFX(clickX, clickY);
        }
    }

    shearSheep(sheep) {
        sheep.woolGrowth = 0;
        this.gameState.woolCount++;
        this.gameState.gold += 10;
        this.showNotification("+10 ذهب 🪙");
        this.updateUI();
    }

    buySheep() {
        if (this.gameState.gold >= 50) {
            this.gameState.gold -= 50;
            this.spawnSheep();
            this.showNotification("تم شراء خروف جديد! 🐑");
        }
        this.updateUI();
    }

    upgradeSpeed() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.player.speed *= 1.2;
            this.showNotification("تمت ترقية السرعة! ⚡");
            document.getElementById('upgrade-speed-btn').disabled = true;
            document.getElementById('upgrade-speed-btn').textContent = "السرعة القصوى";
        }
        this.updateUI();
    }

    restartGame() {
        // Reset Game State
        this.gameState = {
            gold: 0,
            woolCount: 0,
            day: 1,
            time: 0,
            gameActive: true,
            lastTime: 0
        };

        // Reset Lists
        this.sheepList = [];
        this.particles = [];
        this.ripples = [];

        // Reset Player Position (Optional, but good for clean restart)
        this.player.x = 0;
        this.player.y = 0;

        // Hide Game Over Screen
        document.getElementById('game-over').style.display = 'none';

        // Spawn Initial Sheep
        for (let i = 0; i < 20; i++) this.spawnSheep();

        this.updateUI();

        // Restart Loop if stopped
        requestAnimationFrame(this.gameLoop);
    }

    triggerGameOver() {
        this.gameState.gameActive = false;
        document.getElementById('game-over').style.display = 'block';
    }

    update(dt) {
        // Day Cycle
        this.gameState.time += dt * 0.02;
        if (this.gameState.time > 10) {
            this.gameState.time = 0;
            this.gameState.day++;
            this.updateUI();
        }

        this.player.update(dt);

        // Camera Follow
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 5 * dt;
        this.camera.y += (targetCamY - this.camera.y) * 5 * dt;

        // Shop UI visibility
        const distToTent = Math.hypot(this.player.x - this.world.tent.x, this.player.y - this.world.tent.y);
        const shopMenu = document.getElementById('shop-menu');
        if (distToTent < 100) {
            shopMenu.style.display = 'block';
            document.getElementById('buy-sheep-btn').disabled = this.gameState.gold < 50;
            const upgradeBtn = document.getElementById('upgrade-speed-btn');
            if (upgradeBtn.innerText !== "السرعة القصوى") {
                upgradeBtn.disabled = this.gameState.gold < 100;
            }
        } else {
            shopMenu.style.display = 'none';
        }

        // Sheep Logic
        const survivingSheep = [];
        this.sheepList.forEach(s => {
            const event = s.update(dt, this.player, this.world, this.sheepList);
            if (event && event.died) {
                this.showNotification(`مات خروف من ${event.cause}! 💀`);
                this.updateUI();
            } else {
                survivingSheep.push(s);
            }
        });
        this.sheepList = survivingSheep;

        // Game Over Check
        if (this.sheepList.length === 0 && this.gameState.gameActive) {
            this.triggerGameOver();
        }

        // Particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update(dt));

        // Ripples
        this.ripples = this.ripples.filter(r => r.life > 0);
        this.ripples.forEach(r => r.update(dt));
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#e6c288';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        this.world.draw(this.ctx, this.camera, this.canvas.width, this.canvas.height);

        this.sheepList.forEach(s => s.draw(this.ctx));
        this.player.draw(this.ctx, this.gameState.time);

        // VFX
        this.particles.forEach(p => p.draw(this.ctx));
        this.ripples.forEach(r => r.draw(this.ctx));

        // Night Overlay
        const dayProgress = this.gameState.time % 10;
        let darkness = 0;
        if (dayProgress > 7) {
            darkness = (dayProgress - 7) / 3 * 0.6;
        }
        if (darkness > 0) {
            this.ctx.fillStyle = `rgba(0, 10, 40, ${darkness})`;
            this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        }

        this.ctx.restore();
    }

    gameLoop(timestamp) {
        if (!this.gameState.lastTime) this.gameState.lastTime = timestamp;
        const dt = (timestamp - this.gameState.lastTime) / 1000;
        this.gameState.lastTime = timestamp;

        this.update(dt);
        this.draw();

        if (this.gameState.gameActive) requestAnimationFrame(this.gameLoop);
    }

    // VFX Helpers
    createParticleVFX(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    createRippleVFX(x, y) {
        this.ripples.push(new Ripple(x, y));
    }

    // UI Helpers
    showNotification(text) {
        const notif = document.createElement('div');
        notif.className = 'toast';
        notif.textContent = text;
        const area = document.getElementById('notification-area');
        if (area) {
            area.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }
    }

    updateUI() {
        document.getElementById('gold-display').textContent = Math.floor(this.gameState.gold);
        document.getElementById('sheep-display').textContent = this.sheepList.length;
        document.getElementById('wool-display').textContent = this.gameState.woolCount;
        document.getElementById('day-display').textContent = Math.floor(this.gameState.day);
    }
}

// Bootstrap
window.onload = () => {
    window.game = new Game(); // Expose to window for button access
    window.game.init();
};
