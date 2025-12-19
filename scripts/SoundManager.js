export class SoundManager {
    constructor() {
        this.soundEnabled = true;

        // Initialize grass eating sound
        this.grassEatingSound = new Audio('sounds/grasseating.mp3');
        this.grassEatingSound.loop = true;
        this.isGrassEatingPlaying = false;

        // Pre-load footstep sound
        this.footstepSound = new Audio('sounds/footsteps.mp3');
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

        // Try to play from sounds folder
        const audio = new Audio(`sounds/${name}.mp3`);
        audio.play().catch(e => {
            // Fallback or generic error
            console.warn(`Could not play sound: ${name}`, e);
        });
        console.log(`Playing effect: ${name}`);
    }

    playFootstep() {
        if (!this.canPlay()) return;

        // Clone for overlapping sounds if needed, but for simple footsteps 
        // we can just reset and play if it's short enough.
        // Or create a new one to allow overlap.
        const step = this.footstepSound.cloneNode();
        step.volume = 0.4; // Slightly quieter for footsteps
        step.play().catch(e => { });
    }
}
