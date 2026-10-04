import { Users, Zap, Swords, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { ConcreteGameMode, GameMode } from '../../types/game';

export const GAME_MODE_LABEL: Record<GameMode, string> = {
  classic: 'Classic',
  buzzer: 'Buzzer',
  rapid_fire: 'Rapid Fire',
  elimination: 'Elimination',
  mixed: 'Championship',
};

export const GAME_MODE_ICON: Record<ConcreteGameMode, LucideIcon> = {
  classic: Users,
  buzzer: Zap,
  rapid_fire: Swords,
  elimination: ShieldAlert,
};
