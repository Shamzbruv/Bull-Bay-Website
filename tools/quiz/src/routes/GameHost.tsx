import { Link, useParams } from 'react-router-dom';
import { Maximize, Minimize, MonitorPlay } from 'lucide-react';
import { useGameStore } from '../state/gameStore';
import { useGameTimer } from '../hooks/useGameTimer';
import { useHostBroadcast } from '../hooks/useHostBroadcast';
import { useHostKeyboardShortcuts } from '../hooks/useHostKeyboardShortcuts';
import { useBuzzerRelay } from '../hooks/useBuzzerRelay';
import { useFullscreen } from '../hooks/useFullscreen';
import { BackgroundScene } from '../components/brand/BackgroundScene';
import { PreGameScreen } from '../components/game/PreGameScreen';
import { RoundIntro } from '../components/game/RoundIntro';
import { QuestionStage } from '../components/game/QuestionStage';
import { AnswerReveal } from '../components/game/AnswerReveal';
import { Leaderboard } from '../components/game/Leaderboard';
import { TieAnnouncement } from '../components/game/TieAnnouncement';
import { SuddenDeathIntro } from '../components/game/SuddenDeathIntro';
import { WinnerScreen } from '../components/game/WinnerScreen';
import { HostControls } from '../components/game/HostControls';
import { DisplayScaleControl } from '../components/game/DisplayScaleControl';
import { QrBuzzerPanel } from '../components/game/QrBuzzerPanel';
import { ChurchLogo } from '../components/brand/ChurchLogo';

export function GameHost() {
  const { gameId } = useParams();
  const game = useGameStore((s) => s.game);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useGameTimer();
  useHostBroadcast();
  useHostKeyboardShortcuts();
  useBuzzerRelay();

  if (!game || game.id !== gameId) {
    return (
      <BackgroundScene variant="dark">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
          <ChurchLogo size="lg" />
          <h1 className="font-display text-2xl font-bold">No active game</h1>
          <p className="text-white/60 max-w-sm">This game has ended or was never started on this device.</p>
          <Link to="/play/setup" className="rounded-full bg-bb-blue px-6 py-3 font-bold text-white">
            Start a New Game
          </Link>
        </div>
      </BackgroundScene>
    );
  }

  return (
    <BackgroundScene variant="dark">
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <DisplayScaleControl />
        <QrBuzzerPanel gameId={game.id} />
        <a
          href={`${import.meta.env.BASE_URL}game/${game.id}/display`}
          target="_blank"
          rel="noreferrer"
          className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur"
          title="Open Audience Display in a new tab (this stays your control screen)"
        >
          <MonitorPlay size={18} />
        </a>
        <button
          onClick={toggleFullscreen}
          className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {game.phase === 'intro' && <PreGameScreen />}
      {game.phase === 'round_intro' && <RoundIntro />}
      {(game.phase === 'question' || game.phase === 'answering' || game.phase === 'locked') && <QuestionStage />}
      {game.phase === 'reveal' && <AnswerReveal />}
      {game.phase === 'leaderboard' && <Leaderboard />}
      {game.phase === 'tie_breaker' && <TieAnnouncement />}
      {game.phase === 'sudden_death' && <SuddenDeathIntro />}
      {game.phase === 'finished' && <WinnerScreen />}

      <HostControls />
    </BackgroundScene>
  );
}
