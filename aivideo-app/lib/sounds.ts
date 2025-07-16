// Sound effects manager for webapp interactions
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Preload sound effects
    this.loadSounds();
  }

  private loadSounds() {
    const soundEffects = {
      startup: '/sounds/01 Startup.mp3',
      bootScreen: '/sounds/02 Boot Screen Game.mp3',
      cancel: '/sounds/03 SFX Cancel.mp3',
      decide: '/sounds/04 SFX Category Decide.mp3',
      cursor: '/sounds/05 SFX Cursor.mp3',
      confirm: '/sounds/06 SFX Decide.mp3',
      option: '/sounds/07 SFX Option.mp3',
      error: '/sounds/08 SFX System Ng.mp3',
      success: '/sounds/09 SFX System Ok.mp3'
    };

    Object.entries(soundEffects).forEach(([key, src]) => {
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.3; // Set reasonable default volume
        this.sounds.set(key, audio);
      } catch (error) {
        console.warn(`Failed to load sound effect: ${key}`, error);
      }
    });
  }

  play(soundKey: string) {
    if (!this.enabled) return;
    
    const sound = this.sounds.get(soundKey);
    if (sound) {
      try {
        // Reset the audio to start from beginning
        sound.currentTime = 0;
        sound.play().catch(error => {
          console.warn(`Failed to play sound: ${soundKey}`, error);
        });
      } catch (error) {
        console.warn(`Error playing sound: ${soundKey}`, error);
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = clampedVolume;
    });
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Convenience functions for common interactions
export const playSounds = {
  hover: () => soundManager.play('cursor'),
  ok: () => soundManager.play('success'), // System OK for OK/confirm buttons
  cancel: () => soundManager.play('cancel'), // Cancel for cancel buttons
  openOverlay: () => soundManager.play('error'), // System NG for opening overlays
  option: () => soundManager.play('option'),
  decide: () => soundManager.play('decide'),
  storyboard: () => soundManager.play('bootScreen'), // Boot Screen Game for storyboard
  startup: () => soundManager.play('startup')
};

export default soundManager; 