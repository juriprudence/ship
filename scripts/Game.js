import { Player } from './Player.js';
import { World } from './World.js';
import { Sheep } from './Sheep.js';
import { Cow } from './Cow.js';
import { Particle, Ripple, DustParticle, FloatingText, LeafParticle } from './Utils.js';


import { Trought } from './Trought.js';
import { SoundManager } from './SoundManager.js';
import { Wolf } from './Wolf.js';
import { AssetLoader } from './AssetLoader.js';
import { SaveSystem } from './SaveSystem.js';
import { GoldParticle, GoldBurst } from './GoldParticle.js';
import { translations } from './translations.js';
import { Fire } from './Fire.js';

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
            lastTime: 0,
            xp: 0,
            level: 1,
            xpToNextLevel: 100
        };

        this.currentLanguage = 'en'; // Default


        this.camera = { x: 0, y: 0 };

        // Postpone intensive object creation until assets are ready
        this.player = null;
        this.world = null;
        this.soundManager = null;
        this.trought = null;

        this.sheepList = [];
        this.cowList = [];
        this.wolfList = [];
        this.fireList = [];
        this.MAX_SHEEP = 50;
        this.MAX_COW = 30;

        this.particles = [];
        this.ripples = [];
        this.goldParticles = [];
        this.goldBursts = [];
        this.floatingTexts = [];

        this.screenshake = {
            duration: 0,
            intensity: 0
        };


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
            lastY: 0
        };

        this.isTentOccupied = false;

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
        this.buyCow = this.buyCow.bind(this);
        this.buyGrass = this.buyGrass.bind(this);
        this.buyFire = this.buyFire.bind(this);
        this.upgradeSpeed = this.upgradeSpeed.bind(this);
        this.restartGame = this.restartGame.bind(this);

        this.confirmPurchase = this.confirmPurchase.bind(this);
        this.cancelPurchase = this.cancelPurchase.bind(this);
        this.startGame = this.startGame.bind(this);
        this.handleSoundToggle = this.handleSoundToggle.bind(this);
        this.toggleShop = this.toggleShop.bind(this);
        this.showAd = this.showAd.bind(this);
        this.handleAdReward = this.handleAdReward.bind(this);
        this.setLanguage = this.setLanguage.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
    }

    init() {
        this.resize();
        window.addEventListener('resize', this.resize);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);

        // Visibility Change Listener for Ad/App Switching
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });

        // Bind UI buttons
        document.getElementById('buy-sheep-btn').addEventListener('click', this.buySheep);
        document.getElementById('buy-cow-btn').addEventListener('click', this.buyCow);
        document.getElementById('buy-grass-btn').addEventListener('click', this.buyGrass);
        const buyFireBtn = document.getElementById('buy-fire-btn');
        if (buyFireBtn) buyFireBtn.addEventListener('click', this.buyFire);
        document.getElementById('upgrade-speed-btn').addEventListener('click', this.upgradeSpeed);

        document.getElementById('confirm-purchase').addEventListener('click', this.confirmPurchase);
        document.getElementById('cancel-purchase').addEventListener('click', this.cancelPurchase);
        document.getElementById('start-game-btn').addEventListener('click', this.startGame);

        // Bind shop toggle buttons
        document.getElementById('open-shop-btn').addEventListener('click', () => this.toggleShop(true));
        document.getElementById('close-shop-btn').addEventListener('click', () => this.toggleShop(false));

        // Ad button binding
        const adBtn = document.getElementById('show-ad-btn');
        if (adBtn) {
            adBtn.addEventListener('click', this.showAd);
        }

        // Global callback for Android Ads
        window.onAdComplete = () => {
            if (window.game) {
                window.game.handleAdReward();
            }
        };

        // Sound toggle binding - moved soundManager initialization to after assets ready

        // We don't preload here anymore, we wait for language selection
        // Actually, we can preload while language selection is shown if we want, 
        // but let's keep it simple and wait for lang selection or just start preload.
        this.preloadAssets();
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        const t = translations[lang];

        document.documentElement.lang = lang;
        document.documentElement.dir = t.dir;

        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) {
                // If it has a span or specific structure we might need to be careful,
                // but for most it's simple text.
                // For elements with emojis we might want to preserve them if they aren't in translation.
                // But I've included emojis in translations.js
                el.innerText = t[key];
            }
        });



        // Hide language selection, show start screen (which might still be loading)
        document.getElementById('language-selection').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    }

    t(key, params = {}) {
        let text = translations[this.currentLanguage][key] || key;
        for (const [pKey, pVal] of Object.entries(params)) {
            text = text.replace(`{${pKey}}`, pVal);
        }
        return text;
    }

    async preloadAssets() {
        const images = [
            'images/newplayer/player1.png',
            'images/newplayer/player2.png',
            'images/playercis.png',
            'images/playercis2.png',
            'images/playermi.png',
            'images/playermi2.png',
            'images/newplayer/playerhitow.png',
            'images/newplayer/playerhitone.png',
            'images/sheep/sheepw.png',
            'images/sheep/head_down/eat (1).png',
            'images/sheep/head_down/eat (2).png',
            'images/sheep/sheep_die/1.png',
            'images/sheep/sheep_die/2.png',
            'images/sheep/sheep_die/3.png',
            'images/sheep/sheep_die/4.png',
            'images/sheep/sheep.png',
            'images/heart_sheep.png',
            'images/cow/down.png',
            'images/cow/up.png',
            'images/cow/left.png',
            'images/cow/right.png',
            'images/cow/cow_animation/1.png',
            'images/cow/cow_animation/2.png',
            'images/cow/cow_animation/2.png',
            'images/cow/cow_animation/3.png',
            'images/cow/head_down/head_down.png',
            'images/cow/head_down/head_downt.png',
            'images/cow/milk_cow/1.png',
            'images/cow/milk_cow/2.png',
            'images/cow/milk_cow/3.png',
            'images/cow/milk_cow/4.png',
            'images/cow/cow_all.png',
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
            'sounds/daying_cow.mp3',
            'sounds/Shear_the_wool.mp3',
            'sounds/milkking.mp3'
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
            if (statusText) statusText.textContent = `${this.t('loadingAssets')} ${percentage}%`;
        };

        this.loader.onComplete = () => {
            this.assetsReady = true;
            if (statusText) statusText.textContent = this.t('assetsReady');
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
                    const inGrass = this.world.tileMap && (this.world.tileMap.isPositionInLayer(x, y, 'grass') || this.world.tileMap.isPositionInLayer(x, y, 'justgrass'));
                    if (inGrass) {
                        for (let i = 0; i < 6; i++) {
                            this.particles.push(new LeafParticle(x, y));
                        }
                    } else {
                        for (let i = 0; i < 4; i++) {
                            this.particles.push(new DustParticle(x, y + 10));
                        }
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
            if (statusText) statusText.textContent = this.t('loadingFailed');
        }
    }

    startGame() {
        if (!this.assetsReady) return;

        this.gameStarted = true;
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('open-shop-btn').style.display = 'flex';

        // Initial Spawn
        if (this.world && this.world.tileMap) {
            this.world.tileMap.resetConsumedTiles();
        }
        for (let i = 0; i < 2; i++) this.spawnSheep();
        this.spawnCow();
        for (let i = 0; i < 6; i++) this.spawnWolf();

        requestAnimationFrame(this.gameLoop);
    }

    handleSoundToggle(e) {
        if (this.soundManager) {
            this.soundManager.setSoundEnabled(e.target.checked);
        }
    }

    toggleShop(show) {
        const shopMenu = document.getElementById('shop-menu');
        const openShopBtn = document.getElementById('open-shop-btn');
        if (shopMenu) {
            shopMenu.style.display = show ? 'block' : 'none';
            if (openShopBtn) openShopBtn.style.display = show ? 'none' : 'flex';

            // Check if ad is ready whenever shop is opened
            if (show) {
                const adBtn = document.getElementById('show-ad-btn');
                if (adBtn && typeof Android !== 'undefined' && Android.isRewardAdReady) {
                    const isReady = Android.isRewardAdReady();
                    adBtn.style.display = (isReady === 'true') ? 'flex' : 'none';
                }
            }
        }
    }

    showAd() {
        if (typeof Android !== 'undefined' && Android.showRewardAd) {
            this.pause(); // Pause immediately when ad is requested
            Android.showRewardAd();
            // Optional: Hide button immediately to prevent double clicks
            const adBtn = document.getElementById('show-ad-btn');
            if (adBtn) adBtn.style.display = 'none';
        } else {
            this.showNotification(this.t('adNotAvailable'));
        }
    }

    handleAdReward() {
        // Resume game first thing
        this.resume();

        this.gameState.gold += rewardAmount;
        this.updateUI();

        // Visual and audio feedback
        this.showNotification(this.t('getReward', { amount: rewardAmount }));
        this.soundManager.playEffect('hit'); // Success sound
        this.triggerScreenshake(0.3, 10);

        // Spawn gold particles from center of screen (or shop button)
        const centerX = this.camera.x + this.canvas.width / 2;
        const centerY = this.camera.y + this.canvas.height / 2;

        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                this.goldParticles.push(
                    new GoldParticle(
                        centerX + offsetX,
                        centerY + offsetY,
                        this.player.x,
                        this.player.y
                    )
                );
            }, i * 30);
        }
        this.goldBursts.push(new GoldBurst(centerX, centerY, 15));

        this.addFloatingText(centerX, centerY - 50, `+${rewardAmount} GOLD`, "#ffd700", 40);
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

    spawnCow() {
        if (this.cowList.length >= this.MAX_COW) return;
        this.cowList.push(new Cow(this.player.x, this.player.y, this.loader));
        this.updateUI();
    }

    spawnWolf() {
        let pos = { x: (Math.random() * 2000 - 1000), y: (Math.random() * 2000 - 1000) };

        if (this.world && this.world.tileMap) {
            const safePos = this.world.tileMap.getRandomSafePositionInLayer('baze', 'montnghe');
            if (safePos) {
                pos = safePos;
            }
        }

        this.wolfList.push(new Wolf(this.loader, pos.x, pos.y));
        this.soundManager.playEffect('hit'); // Placeholder, maybe use a specific 'howl' if available
        // Actually since I don't have a howl.mp3, I'll use a notification or just 'hit' for now.
        // I'll assume 'hit' is okay for now, or just notification.
        this.showNotification(this.t('wolfHowl'));
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

        if (this.placementMode === 'grassland' || this.placementMode === 'grass') {
            if (this.placementMode === 'grass') {
                this.placeGrass(clickX, clickY);
            } else {
                this.placeGrassland(clickX, clickY);
            }
            this.pointer.isDown = false; // Reset so dragging doesn't start
            return;
        }

        if (this.placementMode === 'fire') {
            this.placeFire(clickX, clickY);
            this.pointer.isDown = false;
            return;
        }

        if (this.trought.checkBounds(clickX, clickY)) {
            if (this.gameState.gold >= 100) {
                this.pendingPurchasePos = { x: clickX, y: clickY };
                document.getElementById('purchase-modal').style.display = 'block';
            } else {
                this.showNotification(this.t('notEnoughGold'));
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
                        this.showNotification(this.t('wolfFlee'));
                        this.soundManager.playEffect('hit'); // Play hit sound
                        this.createParticleVFX(clickedWolf.x, clickedWolf.y, '#f00', 10);
                    } else {
                        this.wolfList.splice(index, 1);
                        this.showNotification(this.t('wolfKill'));
                        this.soundManager.playEffect('hit');
                        this.createParticleVFX(clickedWolf.x, clickedWolf.y, '#f00', 20);
                        this.triggerScreenshake(0.3, 10);
                        this.addXP(25);
                        this.addFloatingText(clickedWolf.x, clickedWolf.y, this.t('killedWolfXP'), "#ff0", 25);

                        // Wolf Loot Drop (30% chance)
                        if (Math.random() < 0.3) {
                            const bonusGold = 50;
                            this.gameState.gold += bonusGold;
                            this.addFloatingText(clickedWolf.x, clickedWolf.y - 30, `+${bonusGold} ${this.t('gold')} (${this.t('wolfPelt')})`, "#ffd700", 22);
                        }



                        // Add to respawn queue
                        this.wolfRespawnQueue.push({ timer: 5 });
                    }
                }
                this.pointer.isDown = false;
                return;
            } else {
                this.showNotification(this.t('wolfTooFar'));
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
            return;
        }

        // Check for cow click (displaced as milking is now automatic in tent)
        // No interaction needed for cows
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
                this.cancelExtraction(this.t('woolCancelMove'));
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
                this.cancelExtraction(this.t('woolCancelClick'));
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
        this.showNotification(this.t('woolCollected'));

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
        // rewards handled below


        // Spawn gold particle animation
        if (this.extractionState.sheep) {
            const sheep = this.extractionState.sheep;
            let goldReward = 10;
            let xpReward = 10;
            let rewardText = "+10 Gold";
            let rewardColor = "#ffd700";

            if (sheep.isGolden) {
                goldReward = 30;
                xpReward = 30;
                rewardText = this.t('goldenWool');
                rewardColor = "#ffcc00";
                this.triggerScreenshake(0.2, 5);
                this.createParticleVFX(sheep.x, sheep.y, "#ffcc00", 20);
            }

            this.gameState.gold += goldReward;
            this.addXP(xpReward);
            this.addFloatingText(sheep.x, sheep.y, rewardText, rewardColor, sheep.isGolden ? 30 : 24);

            // Create multiple gold coins
            const coinCount = sheep.isGolden ? 15 : 5;

            for (let i = 0; i < coinCount; i++) {
                setTimeout(() => {
                    const offsetX = (Math.random() - 0.5) * 30;
                    const offsetY = (Math.random() - 0.5) * 30;
                    this.goldParticles.push(
                        new GoldParticle(
                            sheep.x + offsetX,
                            sheep.y + offsetY,
                            this.player.x,
                            this.player.y
                        )
                    );
                }, i * 50);
            }
            // Spawn burst effect at sheep location
            this.goldBursts.push(new GoldBurst(sheep.x, sheep.y, 8));
        }

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

    shearSheep(sheep) {
        // This old method is now replaced by startExtraction
    }

    buySheep() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.spawnSheep();
            this.showNotification(this.t('newSheep'));
        }
        this.updateUI();
    }

    buyCow() {
        if (this.gameState.gold >= 150) {
            this.gameState.gold -= 150;
            this.spawnCow();
            this.showNotification(this.t('newCow'));
        }
        this.updateUI();
    }

    buyGrass() {
        if (this.gameState.gold >= 40) {
            this.placementMode = 'grass';
            this.toggleShop(false);
            this.showNotification(this.t('chooseGrassLocation'));
        } else {
            this.showNotification(this.t('notEnoughGold40'));
        }
        this.updateUI();
    }

    buyFire() {
        if (this.gameState.gold >= 30) {
            this.placementMode = 'fire';
            this.toggleShop(false);
            this.showNotification(this.t('chooseFireLocation'));
        } else {
            this.showNotification(this.t('notEnoughGold30'));
        }
        this.updateUI();
    }

    placeFire(worldX, worldY) {
        if (this.gameState.gold < 30) {
            this.placementMode = null;
            return;
        }

        this.gameState.gold -= 30;
        this.fireList.push(new Fire(worldX, worldY));
        this.createParticleVFX(worldX, worldY, '#ff4500', 30);
        this.showNotification(this.t('firePlanted'));

        this.placementMode = null;
        this.updateUI();
    }

    placeGrass(worldX, worldY) {
        if (this.gameState.gold < 40) {
            this.placementMode = null;
            return;
        }

        const tileMap = this.world.tileMap;
        if (!tileMap) return;

        const scaledTileSize = tileMap.baseTileSize * tileMap.drawScale;
        const worldWidth = tileMap.mapData.mapWidth * scaledTileSize;
        const worldHeight = tileMap.mapData.mapHeight * scaledTileSize;
        const startX = tileMap.centerX - worldWidth / 2;
        const startY = tileMap.centerY - worldHeight / 2;

        const tx = Math.floor((worldX - startX) / scaledTileSize);
        const ty = Math.floor((worldY - startY) / scaledTileSize);

        if (tx < 0 || tx >= tileMap.mapData.mapWidth || ty < 0 || ty >= tileMap.mapData.mapHeight) {
            return;
        }

        this.gameState.gold -= 40;
        // The user wants "full grass". Looking at map.json, ID 60 is the middle of the grass block.
        const grassId = 60;
        tileMap.addTile('grass', tx, ty, grassId);

        this.createParticleVFX(worldX, worldY, '#4CAF50', 15);
        this.showNotification(this.t('grassPlanted'));

        this.placementMode = null;
        this.updateUI();
    }

    upgradeSpeed() {
        if (this.gameState.gold >= 100) {
            this.gameState.gold -= 100;
            this.player.speed *= 1.2;
            this.showNotification(this.t('speedUpgraded'));
            const speedBtn = document.getElementById('upgrade-speed-btn');
            speedBtn.disabled = true;
            speedBtn.innerText = this.t('maxSpeed');
            speedBtn.setAttribute('data-i18n', 'maxSpeed');
        }
        this.updateUI();
    }



    confirmPurchase() {
        if (this.gameState.gold >= 100 && this.pendingPurchasePos) {
            this.gameState.gold -= 100;
            this.trought.isTransformed = true;
            this.createParticleVFX(this.pendingPurchasePos.x, this.pendingPurchasePos.y, '#ffd700', 20);
            this.showNotification(this.t('troughtBought'));
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
        if (this.world && this.world.tileMap) {
            this.world.tileMap.resetConsumedTiles();
        }
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
        this.cowList = [];
        this.wolfList = [];
        this.particles = [];
        this.ripples = [];

        // Reset Player Position (Optional, but good for clean restart)
        this.player.x = 0;
        this.player.y = 0;

        // Hide Game Over Screen
        document.getElementById('game-over').style.display = 'none';

        // Spawn Initial Sheep
        for (let i = 0; i < 2; i++) this.spawnSheep();
        this.spawnCow();
        for (let i = 0; i < 2; i++) this.spawnWolf();

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

        const allAnimals = [...this.sheepList, ...this.cowList];
        this.player.update(dt, this.soundManager, this.world, allAnimals);
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
                    this.showNotification(this.t('collectingGold'));
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
                this.cancelExtraction(this.t('toofarGold'));
            } else if (dist > 350 && !this.extractionState.hasReached) {
                this.cancelExtraction(this.t('sheepTooFar'));
            }

            if (this.extractionState.timer >= 5) {
                this.completeExtraction();
            }
        }


        const worldEvent = this.world.update(dt, this.player.x, this.player.y, this.gameState.day);
        if (worldEvent.respawned) {
            this.showNotification(this.t('grassRegrown'));
        }

        if (this.trought.isExpired) {
            // Range increases by 1.0 for each day (e.g., Day 1: 1.0, Day 2: 2.0, Day 3: 3.0, etc.)
            const rangeMultiplier = 1 + (this.gameState.day - 1) * 1.0;
            this.trought = new Trought(rangeMultiplier, this.loader);
            this.showNotification(this.t('troughtEmpty'));
        }

        // Camera Follow
        const targetCamX = this.player.x - this.canvas.width / 2;
        const targetCamY = this.player.y - this.canvas.height / 2;
        this.camera.x += (targetCamX - this.camera.x) * 5 * dt;
        this.camera.y += (targetCamY - this.camera.y) * 5 * dt;

        // Apply screenshake
        if (this.screenshake.duration > 0) {
            this.screenshake.duration -= dt;
            this.camera.x += (Math.random() - 0.5) * this.screenshake.intensity;
            this.camera.y += (Math.random() - 0.5) * this.screenshake.intensity;
        }




        // Sheep Logic
        const survivingSheep = [];
        let anyoneEatingOnScreen = false;
        // allAnimals is already defined at top of update()
        this.sheepList.forEach(s => {
            const event = s.update(dt, this.player, this.world, allAnimals, this.trought);
            if (event && event.died) {
                this.showNotification(this.t('sheepDied', { cause: this.t(event.cause) }));
                this.soundManager.playEffect('daying_sheep');
                this.updateUI();
            } else if (event && event.finished) {
                // Fully consumed by wolf
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

        // Update Fires
        this.fireList.forEach(f => f.update(dt));
        this.fireList = this.fireList.filter(f => f.lifeTime > 0);

        // Wolf Logic
        this.wolfList.forEach(w => {
            const event = w.update(dt, this.sheepList, this.world, this.wolfList, this.player, this.fireList);
            if (event && event.kill) {
                this.showNotification(this.t(event.message) + " 🐺");
                this.soundManager.playEffect('daying_sheep');
                this.updateUI();
            } else if (event && event.hit) {
                // Small hit feedback
                this.soundManager.playEffect('hit');
                // Find target sheep to spawn particles (wolf current target is nearest)
                const target = this.sheepList.find(s => Math.hypot(w.x - s.x, w.y - s.y) < 50);
                if (target) {
                    this.createParticleVFX(target.x, target.y, '#f00', 5);
                }
            }

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
                    this.showNotification(this.t(event.message) + " 🐺");
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

        // Game Over Check: End if no ALIVE sheep remain
        const aliveSheepCount = this.sheepList.filter(s => s.lifeState === 'alive').length;
        if (aliveSheepCount === 0 && this.gameState.gameActive) {
            this.triggerGameOver();
        }

        // Cow Logic (same as sheep logic)
        const survivingCows = [];
        this.cowList.forEach(c => {
            const event = c.update(dt, this.player, this.world, allAnimals, this.trought);
            if (event && event.died) {
                this.showNotification(this.t('cowDied', { cause: this.t(event.cause) }));
                this.soundManager.playEffect('daying_cow');
                this.updateUI();
            } else {
                survivingCows.push(c);
                if (c.isEating && c.isVisible(this.camera, this.canvas.width, this.canvas.height)) {
                    if (Math.random() < 0.05) {
                        this.createRippleVFX(c.x, c.y);
                    }
                }
                if (c.isMoving && Math.random() < 0.1) {
                    const inWater = (this.world.tileMap && this.world.tileMap.isPositionInLayer(c.x, c.y, 'water')) ||
                        (Math.hypot(c.x - this.world.oasis.x, c.y - this.world.oasis.y) < this.world.oasis.radius);
                    if (inWater) {
                        this.createRippleVFX(c.x, c.y);
                    }
                }
            }
        });
        this.cowList = survivingCows;

        // Wolf Respawn Logic
        this.wolfRespawnQueue = this.wolfRespawnQueue.filter(q => {
            q.timer -= dt;
            if (q.timer <= 0) {
                this.spawnWolf();
                return false;
            }
            return true;
        });

        // Particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update(dt));

        // Ripples
        this.ripples = this.ripples.filter(r => r.life > 0);
        this.ripples.forEach(r => r.update(dt));

        // Gold Particles
        this.goldParticles = this.goldParticles.filter(p => p.update(dt));
        this.goldBursts = this.goldBursts.filter(b => b.update(dt));

        // Floating Texts
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        this.floatingTexts.forEach(t => t.update(dt));
    }


    draw() {
        // Clear
        this.ctx.fillStyle = '#e6c288';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

        this.world.draw(this.ctx, this.camera, this.canvas.width, this.canvas.height, this.gameState.time, this.player);

        // Z-Index Sorting (Render entities based on Y coordinate)
        const renderList = [];
        if (this.trought) {
            this.trought.draw(this.ctx);
        }

        // Draw Fires
        this.fireList.forEach(f => f.draw(this.ctx));
        renderList.push(this.player);
        this.sheepList.forEach(s => renderList.push(s));
        this.cowList.forEach(c => renderList.push(c));
        this.wolfList.forEach(w => renderList.push(w));

        // Sort by Y (lower Y = higher on screen = drawn first)
        renderList.sort((a, b) => a.y - b.y);

        renderList.forEach(e => {
            if (e === this.player) e.draw(this.ctx, this.gameState.time);
            else e.draw(this.ctx);
        });

        // Ghost grass preview
        if (this.placementMode === 'grass') {
            const tileMap = this.world.tileMap;
            if (tileMap) {
                const scaledTileSize = tileMap.baseTileSize * tileMap.drawScale;
                const worldWidth = tileMap.mapData.mapWidth * scaledTileSize;
                const worldHeight = tileMap.mapData.mapHeight * scaledTileSize;
                const startX = tileMap.centerX - worldWidth / 2;
                const startY = tileMap.centerY - worldHeight / 2;

                const tx = Math.floor((this.mousePos.x - startX) / scaledTileSize);
                const ty = Math.floor((this.mousePos.y - startY) / scaledTileSize);

                const destX = startX + tx * scaledTileSize;
                const destY = startY + ty * scaledTileSize;

                this.ctx.globalAlpha = 0.5;
                // Draw the actual sprite for "full grass"
                const grassId = 60;
                const columns = Math.floor(tileMap.tilesetImage.width / tileMap.baseTileSize);
                const srcX = (grassId % columns) * tileMap.baseTileSize;
                const srcY = Math.floor(grassId / columns) * tileMap.baseTileSize;

                this.ctx.drawImage(
                    tileMap.tilesetImage,
                    srcX, srcY, tileMap.baseTileSize, tileMap.baseTileSize,
                    destX, destY, scaledTileSize, scaledTileSize
                );
                this.ctx.globalAlpha = 1.0;

                // Border
                this.ctx.strokeStyle = '#4CAF50';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(destX, destY, scaledTileSize, scaledTileSize);
            }
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
        this.goldParticles.forEach(p => p.draw(this.ctx));
        this.goldBursts.forEach(b => b.draw(this.ctx));
        this.floatingTexts.forEach(t => t.draw(this.ctx));


        // Night Overlay
        const dayProgress = this.gameState.time % 10;
        let darkness = 0;
        if (dayProgress > 7) {
            darkness = (dayProgress - 7) / 3 * 0.6;
        }

        if (darkness > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 30, ${darkness})`;
            this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        }

        // Red Vigilante (Loss Aversion)
        const anyWolfAttacking = this.wolfList.some(w => w.state === 'attack');
        if (anyWolfAttacking) {
            const gradient = this.ctx.createRadialGradient(
                this.camera.x + this.canvas.width / 2, this.camera.y + this.canvas.height / 2, this.canvas.width / 4,
                this.camera.x + this.canvas.width / 2, this.camera.y + this.canvas.height / 2, this.canvas.width
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
            this.ctx.fillStyle = gradient;
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

    addXP(amount) {
        this.gameState.xp += amount;
        if (this.gameState.xp >= this.gameState.xpToNextLevel) {
            this.levelUp();
        }
        this.updateUI();
    }

    levelUp() {
        this.gameState.level++;
        this.gameState.xp -= this.gameState.xpToNextLevel;
        this.gameState.xpToNextLevel = Math.floor(this.gameState.xpToNextLevel * 1.5);

        this.showNotification(this.t('levelUpMsg', { level: this.gameState.level }));
        this.soundManager.playEffect('hit'); // Placeholder for level-up sound
        this.triggerScreenshake(0.5, 15);
        this.createParticleVFX(this.player.x, this.player.y, '#ffd700', 30);
        this.addFloatingText(this.player.x, this.player.y - 40, this.t('levelUpMsgFloating'), "#fff", 40);

        // Reward: Speed boost
        this.player.speed += 10;

        // Increase difficulty: Spawn additional wolf
        this.spawnWolf();
    }

    addFloatingText(x, y, text, color, size) {
        this.floatingTexts.push(new FloatingText(x, y, text, color, size));
    }

    triggerScreenshake(duration, intensity) {
        this.screenshake.duration = duration;
        this.screenshake.intensity = intensity;
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
        document.getElementById('cow-display').textContent = this.cowList.length;
        document.getElementById('wool-display').textContent = this.gameState.woolCount;
        document.getElementById('day-display').textContent = Math.floor(this.gameState.day);

        // Update Shop Buttons
        const buyBtn = document.getElementById('buy-sheep-btn');
        const buyCowBtn = document.getElementById('buy-cow-btn');
        const upgradeBtn = document.getElementById('upgrade-speed-btn');

        if (buyBtn) buyBtn.disabled = this.gameState.gold < 100;
        if (buyCowBtn) buyCowBtn.disabled = this.gameState.gold < 150;
        const buyGrassBtn = document.getElementById('buy-grass-btn');
        if (buyGrassBtn) buyGrassBtn.disabled = this.gameState.gold < 40;
        const buyFireBtn = document.getElementById('buy-fire-btn');
        if (buyFireBtn) buyFireBtn.disabled = this.gameState.gold < 30;
        if (upgradeBtn && upgradeBtn.getAttribute('data-i18n') !== "maxSpeed") {
            upgradeBtn.disabled = this.gameState.gold < 100;
        }

        // Update XP UI
        const xpBar = document.getElementById('xp-bar');
        const levelDisplay = document.getElementById('level-display');
        if (xpBar) {
            const progress = (this.gameState.xp / this.gameState.xpToNextLevel) * 100;
            xpBar.style.width = `${progress}%`;
        }
        if (levelDisplay) {
            levelDisplay.textContent = this.gameState.level;
        }
    }


    // Save/Load Methods
    saveGame() {
        const success = SaveSystem.save(this);
        if (success) {
            this.showNotification(this.t('saved'));
        } else {
            this.showNotification(this.t('saveFailed'));
        }
        return success;
    }

    loadGame() {
        const result = SaveSystem.load(this);
        this.showNotification(result.message);
        return result;
    }

    hasSaveGame() {
        return SaveSystem.hasSave();
    }

    pause() {
        if (!this.gameState.gameActive) return;
        this.gameState.gameActive = false;
        if (this.soundManager) {
            // Optional: Mute or pause specific sounds if needed
            // this.soundManager.stopAll(); 
        }
        console.log("Game Paused");
    }

    resume() {
        if (this.gameState.gameActive) return;
        this.gameState.gameActive = true;
        this.gameState.lastTime = 0; // Reset time to avoid large delta
        requestAnimationFrame(this.gameLoop);
        console.log("Game Resumed");
    }
}

// Bootstrap
window.onload = () => {
    window.game = new Game(); // Expose to window for button access
    window.game.init();
};
// Bootstrap
