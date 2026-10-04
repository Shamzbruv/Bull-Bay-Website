import { useEffect } from 'react';
import { useSettingsStore } from '../state/settingsStore';
import { soundManager } from '../lib/sound/soundManager';

/** Keeps the synthesized SFX engine in step with the Settings screen. Mount once, at the app root. */
export function useSoundSync() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const volume = useSettingsStore((s) => s.volume);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);
}
