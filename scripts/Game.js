import { Player } from './Player.js';
import { World } from './World.js';
import { Sheep } from './Sheep.js';
import { Particle, Ripple } from './Utils.js';
import { Trought } from './Trought.js';
import { SoundManager } from './SoundManager.js';

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
        this.trought = new Trought(1); // Day 1 multiplier
        this.sheepList = [];
        this.MAX_SHEEP = 50;

        this.particles = [];
        this.ripples = [];

        this.soundManager = new SoundManager();
        this.gameStarted = false;

        this.placementMode = null; // 'grassland' or null
        this.mousePos = { x: 0, y: 0 };

        this.extractionState = {
            sheep: null,
            timer: 0,
            active: false
        };

        this.pointer = {
            isDown: false,
            startX: 0,
            startY: 0,
            isDragging: false,
            dragThreshold: 15,
            lastX: 0,
            lastY: 0
        };

        this.bindMethods();
    }

    bindMethods() {
        this.resize = this.resize.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.buySheep = this.buySheep.bind(this);
        this.upgradeSpeed = this.upgradeSpeed.bind(this);
        this.buyGrassland = this.buyGrassland.bind(this);
        this.restartGame = this.restartGame.bind(this);
        this.confirmPurchase = this.confirmPurchase.bind(this);
        this.cancelPurchase = this.cancelPurchase.bind(this);
        this.startGame = this.startGame.bind(this);
        this.handleSoundToggle = this.handleSoundToggle.bind(this);
        this.toggleShop = this.toggleShop.bind(this);
    }

    init() {
        this.resize();
        window.addEventListener('resize', this.resize);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);

        // Bind UI buttons
        document.getElementById('buy-sheep-btn').addEventListener('click', this.buySheep);
        document.getElementById('upgrade-speed-btn').addEventListener('click', this.upgradeSpeed);
        document.getElementById('buy-grassland-btn').addEventListener('click', this.buyGrassland);
        document.getElementById('confirm-purchase').addEventListener('click', this.confirmPurchase);
        document.getElementById('cancel-purchase').addEventListener('click', this.cancelPurchase);
        document.getElementById('start-game-btn').addEventListener('click', this.startGame);

        // Bind shop toggle buttons
        document.getElementById('open-shop-btn').addEventListener('click', () => this.toggleShop(true));
        document.getElementById('close-shop-btn').addEventListener('click', () => this.toggleShop(false));

        // Sound toggle binding
        const soundCheckbox = document.getElementById('sound-checkbox');
        if (soundCheckbox) {
            soundCheckbox.addEventListener('change', this.handleSoundToggle);
            // Initialize state in case browser remembered checkbox state
            this.soundManager.setSoundEnabled(soundCheckbox.checked);
        }

        // Mouse movement tracking for placement ghost - integrated into onPointerMove
    }

    // Don't start loop or spawn sheep yet
    // requestAnimationFrame(this.gameLoop);

    handleSoundToggle(e) {
        this.soundManager.setSoundEnabled(e.target.checked);
        if (e.target.checked) {
            this.soundManager.playEffect('toggle_on');
        }
    }

    toggleShop(show) {
        const shopMenu = document.getElementById('shop-menu');
        if (shopMenu) {
            shopMenu.style.display = show ? 'block' : 'none';
        }
    }

    startGame() {
        this.gameStarted = true;
        document.getElementById('start-screen').style.display = 'none';

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

    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        this.pointer.isDown = true;
        this.pointer.startX = clickX;
        this.pointer.startY = clickY;
        this.pointer.lastX = clickX;
        this.pointer.lastY = clickY;
        this.pointer.isDragging = false;

        if (this.placementMode === 'grassland') {
            this.placeGrassland(clickX, clickY);
            this.pointer.isDown = false; // Reset so dragging doesn't start
            return;
        }

        if (this.trought.checkBounds(clickX, clickY)) {
            if (this.gameState.gold >= 100) {
                this.pendingPurchasePos = { x: clickX, y: clickY };
                document.getElementById('purchase-modal').style.display = 'block';
            } else {
                this.showNotification("ليس لديك ذهب كافٍ! (تحتاج 100) ❌");
            }
            this.pointer.isDown = false;
            return;
        }

        let clickedSheep = false;
        for (let s of this.sheepList) {
            const dx = s.x - clickX;
            const dy = s.y - clickY;
            if (dx * dx + dy * dy < 900) {
                if (s.woolGrowth >= 100) {
                    this.startExtraction(s);
                    clickedSheep = true;
                } else {
                    s.x += (Math.random() - 0.5) * 20;
                    s.y += (Math.random() - 0.5) * 20;
                }
            }
        }

        if (clickedSheep) {
            this.pointer.isDown = false;
        }
    }

    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        this.mousePos.x = clickX;
        this.mousePos.y = clickY;

        if (!this.pointer.isDown) return;

        const dx = clickX - this.pointer.startX;
        const dy = clickY - this.pointer.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.pointer.dragThreshold || this.pointer.isDragging) {
            this.pointer.isDragging = true;

            // If we were extracting, cancel it
            if (this.extractionState.active) {
                this.cancelExtraction("تم إلغاء جمع الذهب بسبب الحركة! ❌");
            }
        }
    }

    onPointerUp(e) {
        if (!this.pointer.isDown) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        if (!this.pointer.isDragging) {
            // It was a click
            if (this.extractionState.active) {
                this.cancelExtraction("تم إلغاء جمع الذهب بالنقر على الأرض! ❌");
            }
            this.player.handleInput(clickX, clickY);
            this.createRippleVFX(clickX, clickY);
        } else {
            // Drag finished, stop player
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
            this.player.isMoving = false;
        }

        this.pointer.isDown = false;
        this.pointer.isDragging = false;
    }

    startExtraction(sheep) {
        if (this.extractionState.active) return;

        // Note: We don't shear yet, we wait until reached?
        // Actually user said "when player take wool to go to the sheep", 
        // implies taking it starts the journey. I'll keep wool reset here but maybe move it to completion?
        // Let's move wool reset to completion for more realism, or keep it to show it's "claimed".
        // I'll keep it claimed (woolGrowth = 0) so other clicks don't trigger it.

        sheep.woolGrowth = 0;
        this.extractionState = {
            sheep: sheep,
            timer: 0,
            active: true,
            hasReached: false
        };

        // Move player to sheep
        this.player.handleInput(sheep.x, sheep.y);

        this.soundManager.playEffect('shear_the_wool');
        this.createParticleVFX(sheep.x, sheep.y, '#fff', 10);
        this.showNotification("توجه إلى الخروف لجمع الذهب! 🚶‍♂️");

        // Stop sheep movement
        sheep.isBeingSheared = true;
    }

    cancelExtraction(message) {
        if (this.extractionState.sheep) {
            this.extractionState.sheep.isBeingSheared = false;
        }
        this.soundManager.stopShearingSound();
        this.extractionState.active = false;
        this.extractionState.sheep = null;
        this.player.isShearing = false;
        if (message) this.showNotification(message);
    }

    completeExtraction() {
        this.gameState.woolCount++;
        this.gameState.gold += 10;
        this.showNotification("+10 ذهب 🪙");
        this.updateUI();
        if (this.extractionState.sheep) {
            this.extractionState.sheep.isBeingSheared = false;
        }
        this.soundManager.stopShearingSound();
        this.extractionState.active = false;
        this.extractionState.sheep = null;
        this.player.isShearing = false;
    }

    shearSheep(sheep) {
        // This old method is now replaced by startExtraction
    }

    buySheep() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
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

    buyGrassland() {
        if (this.gameState.gold >= 500) {
            this.placementMode = 'grassland';
            this.toggleShop(false);
            this.showNotification("اختر مكاناً لزراعة العشب! 🌿");
        }
        this.updateUI();
    }

    placeGrassland(x, y) {
        if (this.gameState.gold >= 500) {
            this.gameState.gold -= 500;
            import('./Grassland.js').then(m => {
                this.world.grasslands.push(new m.Grassland(x, y));
            });
            this.createParticleVFX(x, y, '#6ab04c', 20);
            this.showNotification("تمت زراعة العشب! 🌿");
            this.placementMode = null;
            this.updateUI();
        }
    }

    confirmPurchase() {
        if (this.gameState.gold >= 100 && this.pendingPurchasePos) {
            this.gameState.gold -= 100;
            this.trought.isTransformed = true;
            this.createParticleVFX(this.pendingPurchasePos.x, this.pendingPurchasePos.y, '#ffd700', 20);
            this.showNotification("تم شراء الحوض! 🚰");
            this.updateUI();
        }
        this.cancelPurchase(); // Close modal
    }

    cancelPurchase() {
        document.getElementById('purchase-modal').style.display = 'none';
        this.pendingPurchasePos = null;
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

        // Pointer Drag Movement
        if (this.pointer.isDragging) {
            const dx = this.mousePos.x - this.pointer.startX;
            const dy = this.mousePos.y - this.pointer.startY;
            const angle = Math.atan2(dy, dx);
            const targetDist = 100;

            this.player.handleInput(
                this.player.x + Math.cos(angle) * targetDist,
                this.player.y + Math.sin(angle) * targetDist
            );
        }

        this.player.update(dt, this.soundManager);
        this.trought.update(dt);

        // Extraction Logic
        if (this.extractionState.active) {
            const sheep = this.extractionState.sheep;
            const dist = Math.hypot(this.player.x - sheep.x, this.player.y - sheep.y);

            // Periodically update target to follow sheep if it moves
            if (!this.extractionState.hasReached) {
                this.player.targetX = sheep.x;
                this.player.targetY = sheep.y;
            }

            if (dist < 20) {
                if (!this.extractionState.hasReached) {
                    this.extractionState.hasReached = true;
                    this.showNotification("جاري جمع الذهب... اثبت مكانك! ⏳");
                    console.log('DEBUG: Entering Shearing State');
                    this.player.isShearing = true;
                    this.soundManager.startShearingSound();
                }
                this.extractionState.timer += dt;

                // Stick to sheep
                this.player.x = sheep.x;
                this.player.y = sheep.y;
                this.player.targetX = sheep.x;
                this.player.targetY = sheep.y;
                this.player.isMoving = false;

            } else if (this.extractionState.hasReached && dist > 40) {
                this.cancelExtraction("ابتعدت كثيراً! تم إلغاء جمع الذهب ❌");
            } else if (dist > 350 && !this.extractionState.hasReached) {
                this.cancelExtraction("الخروف بعيد جداً! ❌");
            }

            if (this.extractionState.timer >= 5) {
                this.completeExtraction();
            }
        }

        const worldEvent = this.world.update(dt, this.player.x, this.player.y, this.gameState.day);
        if (worldEvent.respawned) {
            this.showNotification("نمت الأعشاب في مكان جديد! 🌿");
        }

        if (this.trought.isExpired) {
            // Range increases by 1.0 for each day (e.g., Day 1: 1.0, Day 2: 2.0, Day 3: 3.0, etc.)
            const rangeMultiplier = 1 + (this.gameState.day - 1) * 1.0;
            this.trought = new Trought(rangeMultiplier);
            this.showNotification("انتهى مفعول الحوض! 🥀");
        }

        // Camera Follow
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 5 * dt;
        this.camera.y += (targetCamY - this.camera.y) * 5 * dt;



        // Sheep Logic
        const survivingSheep = [];
        let anyoneEatingOnScreen = false;
        this.sheepList.forEach(s => {
            const event = s.update(dt, this.player, this.world, this.sheepList, this.trought);
            if (event && event.died) {
                this.showNotification(`مات خروف من ${event.cause}! 💀`);
                this.soundManager.playEffect('daying_sheep');
                this.updateUI();
            } else {
                survivingSheep.push(s);
                if (s.isEating && s.isVisible(this.camera, this.canvas.width, this.canvas.height)) {
                    anyoneEatingOnScreen = true;
                }
            }
        });
        this.sheepList = survivingSheep;

        // Update Sound
        this.soundManager.updateGrassEating(anyoneEatingOnScreen);

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
        this.trought.draw(this.ctx);

        this.sheepList.forEach(s => s.draw(this.ctx));
        this.player.draw(this.ctx, this.gameState.time);

        // Placement Ghost
        if (this.placementMode === 'grassland') {
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = '#6ab04c';
            this.ctx.beginPath();
            this.ctx.arc(this.mousePos.x, this.mousePos.y, 80, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.font = '50px serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🌿', this.mousePos.x, this.mousePos.y);
            this.ctx.globalAlpha = 1.0;
        }

        // Extraction Progress Bar
        if (this.extractionState.active) {
            const barWidth = 40;
            const barHeight = 6;
            const px = this.player.x - barWidth / 2;
            const py = this.player.y - 70; // Above player

            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(px, py, barWidth, barHeight);

            // Progress
            const progress = Math.min(this.extractionState.timer / 5, 1);
            this.ctx.fillStyle = '#ffd700'; // Gold color
            this.ctx.fillRect(px, py, barWidth * progress, barHeight);
        }

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

        // Update Shop Buttons
        const buyBtn = document.getElementById('buy-sheep-btn');
        const buyGrasslandBtn = document.getElementById('buy-grassland-btn');
        const upgradeBtn = document.getElementById('upgrade-speed-btn');

        if (buyBtn) buyBtn.disabled = this.gameState.gold < 100;
        if (buyGrasslandBtn) buyGrasslandBtn.disabled = this.gameState.gold < 500;
        if (upgradeBtn && upgradeBtn.textContent !== "السرعة القصوى") {
            upgradeBtn.disabled = this.gameState.gold < 100;
        }
    }
}

// Bootstrap
window.onload = () => {
    window.game = new Game(); // Expose to window for button access
    window.game.init();
};
