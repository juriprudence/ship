import { Player } from './Player.js';
import { World } from './World.js';
import { Sheep } from './Sheep.js';
import { Particle, Ripple, DustParticle } from './Utils.js';
import { Trought } from './Trought.js';
import { SoundManager } from './SoundManager.js';
import { Wolf } from './Wolf.js';
import { AssetLoader } from './AssetLoader.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.loader = new AssetLoader();
        this.assetsReady = false;

        this.gameState = {
            gold: 0,
            woolCount: 0,
            day: 1,
            time: 0,
            gameActive: true,
            lastTime: 0
        };

        this.camera = { x: 0, y: 0 };

        // Postpone intensive object creation until assets are ready
        this.player = null;
        this.world = null;
        this.soundManager = null;
        this.trought = null;

        this.sheepList = [];
        this.wolfList = [];
        this.MAX_SHEEP = 50;

        this.particles = [];
        this.ripples = [];

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

        this.wolfRespawnQueue = [];

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

        document.getElementById('confirm-purchase').addEventListener('click', this.confirmPurchase);
        document.getElementById('cancel-purchase').addEventListener('click', this.cancelPurchase);
        document.getElementById('start-game-btn').addEventListener('click', this.startGame);

        // Bind shop toggle buttons
        document.getElementById('open-shop-btn').addEventListener('click', () => this.toggleShop(true));
        document.getElementById('close-shop-btn').addEventListener('click', () => this.toggleShop(false));

        // Sound toggle binding - moved soundManager initialization to after assets ready

        this.preloadAssets();
    }

    async preloadAssets() {
        const images = [
            'images/newplayer/player1.png',
            'images/newplayer/player2.png',
            'images/playercis.png',
            'images/playercis2.png',
            'images/newplayer/playerhitow.png',
            'images/newplayer/playerhitone.png',
            'images/sheep/down.png',
            'images/sheep/up.png',
            'images/sheep/right.png',
            'images/sheep/left.png',
            'images/sheep/walk_1.png',
            'images/sheep/walk_2.png',
            'images/sheep/walk_3.png',
            'images/sheep/head_down/eat (1).png',
            'images/sheep/head_down/eat (2).png',
            'images/wolf1.png',
            'images/wolf2.png',
            'scripts/maps/spritesheet.png',
            'images/trought/troughtdis.png',
            'images/trought/trought.png'
        ];

        const sounds = [
            'sounds/grasseating.mp3',
            'sounds/footsteps.mp3',
            'sounds/scissors_cutting.mp3',
            'sounds/hit.mp3',
            'sounds/daying_sheep.mp3',
            'sounds/Shear_the_wool.mp3'
        ];

        const jsons = [
            'scripts/maps/map.json'
        ];

        const progressBar = document.getElementById('loading-bar');
        const statusText = document.getElementById('loading-status');
        const startBtn = document.getElementById('start-game-btn');

        this.loader.onProgress = (progress) => {
            const percentage = Math.round(progress * 100);
            if (progressBar) progressBar.style.width = `${percentage}%`;
            if (statusText) statusText.textContent = `جاري تحميل الموارد... ${percentage}%`;
        };

        this.loader.onComplete = () => {
            this.assetsReady = true;
            if (statusText) statusText.textContent = 'تم تحميل جميع الموارد بنجاح! 📦';
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.classList.add('ready');
            }

            // Re-initialize key components now that assets are ready
            this.soundManager = new SoundManager(this.loader);
            this.world = new World(this.loader);
            this.player = new Player(this.loader);
            this.trought = new Trought(1, this.loader);

            // Hook up footstep callback
            this.player.onFootstep = (x, y) => {
                const inWater = (this.world.tileMap && this.world.tileMap.isPositionInLayer(x, y, 'water')) ||
                    (Math.hypot(x - this.world.oasis.x, y - this.world.oasis.y) < this.world.oasis.radius);

                if (inWater) {
                    this.createRippleVFX(x, y);
                } else {
                    for (let i = 0; i < 4; i++) {
                        this.particles.push(new DustParticle(x, y + 10));
                    }
                }
            };

            // Initial sound state
            const soundCheckbox = document.getElementById('sound-checkbox');
            if (soundCheckbox) {
                soundCheckbox.addEventListener('change', this.handleSoundToggle);
                this.soundManager.setSoundEnabled(soundCheckbox.checked);
            }
        };

        try {
            await Promise.all([
                this.loader.loadImages(images),
                this.loader.loadSounds(sounds),
                this.loader.loadJSONs(jsons)
            ]);
        } catch (e) {
            console.error("Asset loading failed", e);
            if (statusText) statusText.textContent = 'فشل تحميل بعض الموارد. حاول تحديث الصفحة.';
        }
    }

    startGame() {
        if (!this.assetsReady) return;

        this.gameStarted = true;
        document.getElementById('start-screen').style.display = 'none';

        // Initial Spawn
        for (let i = 0; i < 3; i++) this.spawnSheep();
        for (let i = 0; i < 5; i++) this.wolfList.push(new Wolf(this.loader));

        requestAnimationFrame(this.gameLoop);
    }

    handleSoundToggle(e) {
        if (this.soundManager) {
            this.soundManager.setSoundEnabled(e.target.checked);
        }
    }

    toggleShop(show) {
        const shopMenu = document.getElementById('shop-menu');
        if (shopMenu) {
            shopMenu.style.display = show ? 'block' : 'none';
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    spawnSheep() {
        if (this.sheepList.length >= this.MAX_SHEEP) return;
        this.sheepList.push(new Sheep(this.player.x, this.player.y, this.loader));
        this.updateUI();
    }

    onPointerDown(e) {
        if (!this.assetsReady) return;
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

        let clickedWolf = null;
        for (let w of this.wolfList) {
            const dx = w.x - clickX;
            const dy = w.y - clickY;
            if (dx * dx + dy * dy < 1600) { // 40px radius click detection
                clickedWolf = w;
                break;
            }
        }

        if (clickedWolf) {
            const dist = Math.hypot(this.player.x - clickedWolf.x, this.player.y - clickedWolf.y);
            if (dist < this.player.actionRange) {
                this.player.attack();
                // Determine direction to face wolf
                const dx = clickedWolf.x - this.player.x;
                const dy = clickedWolf.y - this.player.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.player.direction = dx > 0 ? 3 : 2;
                } else {
                    this.player.direction = dy > 0 ? 1 : 0;
                }

                // Wolf Hit Logic
                const index = this.wolfList.indexOf(clickedWolf);
                if (index > -1) {
                    clickedWolf.health--;
                    if (clickedWolf.health > 0) {
                        clickedWolf.flee(this.player.x, this.player.y);
                        this.showNotification("هرب الذئب! 🐺💨");
                        this.soundManager.playEffect('hit'); // Play hit sound
                        this.createParticleVFX(clickedWolf.x, clickedWolf.y, '#f00', 10);
                    } else {
                        this.wolfList.splice(index, 1);
                        this.showNotification("لقد قتلت الذئب! ⚔️");
                        this.soundManager.playEffect('hit');
                        this.createParticleVFX(clickedWolf.x, clickedWolf.y, '#f00', 20);

                        // Add to respawn queue
                        this.wolfRespawnQueue.push({ timer: 5 });
                    }
                }
                this.pointer.isDown = false;
                return;
            } else {
                this.showNotification("الذئب بعيد جداً! اقترب منه 🏃‍♂️");
            }
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
        if (!this.assetsReady) return;
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
        if (!this.assetsReady) return;
        if (!this.pointer.isDown) return;

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        if (!this.pointer.isDragging) {
            // It was a click
            if (this.extractionState.active) {
                this.cancelExtraction("تم إلغاء جمع الذهب بالنقر على الأرض! ❌");
            }
            // Project click target further (1.5x)
            const dx = clickX - this.player.x;
            const dy = clickY - this.player.y;
            this.player.handleInput(this.player.x + dx * 1.5, this.player.y + dy * 1.5);
            // Context-aware click VFX
            const inWater = (this.world.tileMap && this.world.tileMap.isPositionInLayer(clickX, clickY, 'water')) ||
                (Math.hypot(clickX - this.world.oasis.x, clickY - this.world.oasis.y) < this.world.oasis.radius);

            if (inWater) {
                this.createRippleVFX(clickX, clickY);
            } else {
                this.createParticleVFX(clickX, clickY, '#d2b48c', 5);
            }
        } else {
            // Drag finished, stop player immediately
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

        this.soundManager.playEffect('Shear_the_wool');
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
        this.wolfList = [];
        this.particles = [];
        this.ripples = [];

        // Reset Player Position (Optional, but good for clean restart)
        this.player.x = 0;
        this.player.y = 0;

        // Hide Game Over Screen
        document.getElementById('game-over').style.display = 'none';

        // Spawn Initial Sheep
        for (let i = 0; i < 3; i++) this.spawnSheep();
        for (let i = 0; i < 5; i++) this.wolfList.push(new Wolf(this.loader));

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
            const dragDist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Dynamic target distance that scales with drag intensity
            const targetDist = 200 + dragDist * 2;

            this.player.handleInput(
                this.player.x + Math.cos(angle) * targetDist,
                this.player.y + Math.sin(angle) * targetDist
            );
        }

        this.player.update(dt, this.soundManager, this.world);
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
            this.trought = new Trought(rangeMultiplier, this.loader);
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
                    // Spawn ripples occasionally while drinking
                    if (Math.random() < 0.05) {
                        this.createRippleVFX(s.x, s.y);
                    }
                }
                // Spawn ripples while walking in water
                if (s.isMoving && Math.random() < 0.1) {
                    const inWater = (this.world.tileMap && this.world.tileMap.isPositionInLayer(s.x, s.y, 'water')) ||
                        (Math.hypot(s.x - this.world.oasis.x, s.y - this.world.oasis.y) < this.world.oasis.radius);
                    if (inWater) {
                        this.createRippleVFX(s.x, s.y);
                    }
                }
            }
        });
        this.sheepList = survivingSheep;

        // Wolf Logic
        this.wolfList.forEach(w => {
            const event = w.update(dt, this.sheepList, this.world, this.wolfList, this.player);

            // Wolf ripples
            const isMoving = Math.abs(w.x - w.lastX || 0) > 0.1 || Math.abs(w.y - w.lastY || 0) > 0.1;
            if (isMoving && Math.random() < 0.1) {
                const inWater = (this.world.tileMap && this.world.tileMap.isPositionInLayer(w.x, w.y, 'water')) ||
                    (Math.hypot(w.x - this.world.oasis.x, w.y - this.world.oasis.y) < this.world.oasis.radius);
                if (inWater) {
                    this.createRippleVFX(w.x, w.y);
                }
            }
            w.lastX = w.x;
            w.lastY = w.y;

            if (event) {
                if (event.kill) {
                    this.showNotification(event.message + "! 🐺");
                    this.soundManager.playEffect('daying_sheep');
                    this.updateUI();
                } else if (event.hit) {
                    // Small hit feedback
                    this.soundManager.playEffect('hit');
                    // Find target sheep to spawn particles (wolf current target is nearest)
                    const target = this.sheepList.find(s => Math.hypot(w.x - s.x, w.y - s.y) < 50);
                    if (target) {
                        this.createParticleVFX(target.x, target.y, '#f00', 5);
                    }
                }
            }
        });

        // Update Sound
        this.soundManager.updateGrassEating(anyoneEatingOnScreen);

        // Game Over Check
        if (this.sheepList.length === 0 && this.gameState.gameActive) {
            this.triggerGameOver();
        }

        // Wolf Respawn Logic
        for (let i = this.wolfRespawnQueue.length - 1; i >= 0; i--) {
            this.wolfRespawnQueue[i].timer -= dt;
            if (this.wolfRespawnQueue[i].timer <= 0) {
                this.wolfList.push(new Wolf(this.loader));
                this.wolfRespawnQueue.splice(i, 1);
            }
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
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        this.world.draw(this.ctx, this.camera, this.canvas.width, this.canvas.height);
        this.trought.draw(this.ctx);

        this.sheepList.forEach(s => s.draw(this.ctx));
        this.wolfList.forEach(w => w.draw(this.ctx));
        this.player.draw(this.ctx, this.gameState.time);



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
        const upgradeBtn = document.getElementById('upgrade-speed-btn');

        if (buyBtn) buyBtn.disabled = this.gameState.gold < 100;
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
