// src/utils/sounds.ts
class SoundManager {
    private sounds: { [key: string]: HTMLAudioElement } = {};
    private enabled: boolean = true;

    constructor() {
        // Preload sounds
        this.sounds = {
            move: new Audio('/sounds/moveSound2.mp3'),
            capture: new Audio('/sounds/captureSound1.mp3'),
            check: new Audio('/sounds/checkSound1.mp3'),
            gameOver: new Audio('/sounds/game-over.mp3'),
            invalid: new Audio('/sounds/invalid.mp3'),
            minePlaced: new Audio('/sounds/minePlace2.mp3'),
            explosion: new Audio('/sounds/smallExplosion.mp3')
        };

        // Optional: Reduce volume
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.8;
        });
    }

    play(soundName: keyof typeof this.sounds) {
        if (!this.enabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // Stop and reset the sound in case it's already playing
            sound.currentTime = 0;
            sound.play().catch(e => console.error('Error playing sound:', e));
        }
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}

export const soundManager = new SoundManager();