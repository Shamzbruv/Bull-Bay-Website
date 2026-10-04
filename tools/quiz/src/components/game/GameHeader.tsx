import { ChurchLogo } from '../brand/ChurchLogo';
import { brand } from '../../config/brand';
import type { ConcreteGameMode } from '../../types/game';
import { GAME_MODE_ICON, GAME_MODE_LABEL } from '../../lib/game/gameModeLabels';

interface GameHeaderProps {
  round?: string;
  questionNumber?: number;
  totalQuestions?: number;
  /** Set only during a Championship game, to the quarter currently in play. */
  segmentMode?: ConcreteGameMode;
}

export function GameHeader({ round, questionNumber, totalQuestions, segmentMode }: GameHeaderProps) {
  const SegmentIcon = segmentMode ? GAME_MODE_ICON[segmentMode] : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ChurchLogo size="sm" />
        <span className="font-display font-bold tracking-wide text-white/90 hidden sm:inline">{brand.abbreviatedTitle}</span>
      </div>
      <div className="text-center flex flex-col items-center gap-1">
        {round && <div className="text-xs sm:text-sm uppercase tracking-[0.25em] text-bb-gold">{round}</div>}
        {SegmentIcon && segmentMode && (
          <div className="flex items-center gap-1 text-[10px] sm:text-xs uppercase tracking-widest text-bb-cyan">
            <SegmentIcon size={12} />
            {GAME_MODE_LABEL[segmentMode]}
          </div>
        )}
      </div>
      <div className="text-right">
        {questionNumber !== undefined && totalQuestions !== undefined && (
          <span className="text-sm text-white/60">
            Question {questionNumber} of {totalQuestions}
          </span>
        )}
      </div>
    </div>
  );
}
