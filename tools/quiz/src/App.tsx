import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FamilyFeud, FamilyFeudDisplay } from './routes/FamilyFeud';
import { PuzzleDisplay } from './routes/PuzzleDisplay';
import { Home } from './routes/Home';
import { PlaySetup } from './routes/PlaySetup';
import { GameHost } from './routes/GameHost';
import { GameDisplay } from './routes/GameDisplay';
import { PhoneBuzzer } from './routes/PhoneBuzzer';
import { QuizLibrary } from './routes/QuizLibrary';
import { QuizDetail } from './routes/QuizDetail';
import { AdminDashboard } from './routes/AdminDashboard';
import { AdminQuizList } from './routes/AdminQuizList';
import { AdminQuizBuilder } from './routes/AdminQuizBuilder';
import { History } from './routes/History';
import { Settings } from './routes/Settings';
import { useSoundSync } from './hooks/useSoundSync';
import { usePreloadAssets } from './hooks/usePreloadAssets';

const PuzzleHost = lazy(() => import('./routes/PuzzleHost'));

function App() {
  useSoundSync();
  usePreloadAssets();

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/puzzles/display/:id" element={<PuzzleDisplay />} />
        <Route path="/puzzles/:mode" element={
          <Suspense fallback={<p role="status" className="p-6 text-white">Loading Bible puzzles…</p>}><PuzzleHost /></Suspense>
        } />
        <Route path="/feud" element={<FamilyFeud />} />
        <Route path="/feud/:gameId/display" element={<FamilyFeudDisplay />} />
        <Route path="/play/setup" element={<PlaySetup />} />
        <Route path="/game/:gameId" element={<GameHost />} />
        <Route path="/game/:gameId/display" element={<GameDisplay />} />
        <Route path="/game/:gameId/buzzer" element={<PhoneBuzzer />} />
        <Route path="/quizzes" element={<QuizLibrary />} />
        <Route path="/quizzes/:quizId" element={<QuizDetail />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/quizzes" element={<AdminQuizList />} />
        <Route path="/admin/quizzes/new" element={<AdminQuizBuilder />} />
        <Route path="/admin/quizzes/:quizId/edit" element={<AdminQuizBuilder />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
