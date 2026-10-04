import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_BUZZER_KEYS, type BuzzerKeyMap } from '../types/game';

interface SettingsStore {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0..1
  buzzerKeys: BuzzerKeyMap;

  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setBuzzerKey: (teamSlot: number, key: string) => void;
  resetBuzzerKeys: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.6,
      buzzerKeys: DEFAULT_BUZZER_KEYS,

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      setVolume: (volume) => set({ volume }),
      setBuzzerKey: (teamSlot, key) => set((s) => ({ buzzerKeys: { ...s.buzzerKeys, [teamSlot]: key.toLowerCase() } })),
      resetBuzzerKeys: () => set({ buzzerKeys: DEFAULT_BUZZER_KEYS }),
    }),
    { name: 'bbntcog-settings' },
  ),
);
