export class SoundManager {
    constructor(assets) {
        this.soundEnabled = true;
        this.assets = assets;

        // Use preloaded sounds if available
        this.grassEatingSound = assets ? assets.getAsset('sounds', 'sounds/grasseating.mp3') : new Audio('sounds/grasseating.mp3');
        this.grassEatingSound.loop = true;
        this.isGrassEatingPlaying = false;

        this.footstepSound = assets ? assets.getAsset('sounds', 'sounds/footsteps.mp3') : new Audio('sounds/footsteps.mp3');

        this.scissorSound = assets ? assets.getAsset('sounds', 'sounds/scissors_cutting.mp3') : new Audio('sounds/scissors_cutting.mp3');
        this.scissorSound.loop = true;
        this.isShearingPlaying = false;

        this.milkSound = assets ? assets.getAsset('sounds', 'sounds/milkking.mp3') : new Audio('sounds/milkking.mp3');
        this.milkSound.loop = true;
        this.isMilkingPlaying = false;
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        console.log(`Sound Manager: Sound is now ${this.soundEnabled ? 'ENABLED' : 'DISABLED'}`);

        // If sound disabled, stop looping sounds
        if (!this.soundEnabled) {
            this.stopGrassEating();
        }
    }

    updateGrassEating(shouldPlay) {
        if (!this.soundEnabled) {
            this.stopGrassEating();
            return;
        }

        if (shouldPlay && !this.isGrassEatingPlaying) {
            this.grassEatingSound.play().catch(e => console.log("Audio play deferred", e));
            this.isGrassEatingPlaying = true;
        } else if (!shouldPlay && this.isGrassEatingPlaying) {
            this.stopGrassEating();
        }
    }

    stopGrassEating() {
        this.grassEatingSound.pause();
        this.grassEatingSound.currentTime = 0;
        this.isGrassEatingPlaying = false;
    }

    // Helper to check if sound is enabled before playing
    canPlay() {
        return this.soundEnabled;
    }

    playEffect(name) {
        if (!this.canPlay()) return;

        const url = `sounds/${name}.mp3`;
        let audio;

        if (this.assets && this.assets.getAsset('sounds', url)) {
            audio = this.assets.getAsset('sounds', url).cloneNode();
        } else {
            audio = new Audio(url);
        }

        audio.play().catch(e => {
            console.warn(`Could not play sound: ${name}`, e);
        });
        console.log(`Playing effect: ${name}`);
    }

    playFootstep() {
        if (!this.canPlay()) return;

        // Clone for overlapping sounds
        const step = this.footstepSound.cloneNode();
        step.volume = 0.4; // Slightly quieter for footsteps
        step.play().catch(e => { });
    }

    startShearingSound() {
        if (!this.canPlay()) return;
        if (this.isShearingPlaying) return;

        this.scissorSound.currentTime = 0;
        this.scissorSound.play().catch(e => console.log(e));
        this.isShearingPlaying = true;
    }

    stopShearingSound() {
        this.scissorSound.pause();
        this.scissorSound.currentTime = 0;
        this.isShearingPlaying = false;
    }

    startMilkingSound() {
        if (!this.canPlay()) return;
        if (this.isMilkingPlaying) return;

        this.milkSound.currentTime = 0;
        this.milkSound.play().catch(e => console.log(e));
        this.isMilkingPlaying = true;
    }

    stopMilkingSound() {
        this.milkSound.pause();
        this.milkSound.currentTime = 0;
        this.isMilkingPlaying = false;
    }
}
