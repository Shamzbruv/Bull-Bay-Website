import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, ALargeSmall } from 'lucide-react';
import { quizChannel } from '../../lib/broadcast/quizChannel';

const MIN = 70;
const MAX = 170;
const STEP = 10;

/** Lets the host resize everything on the audience display remotely, without touching that window. */
export function DisplayScaleControl() {
  const [scale, setScale] = useState(100);
  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    return quizChannel.subscribe((message) => {
      if (message.type === 'PRESENTER_READY') {
        quizChannel.send({ type: 'DISPLAY_SCALE', payload: { scale: scaleRef.current } });
      }
    });
  }, []);

  function change(next: number) {
    const clamped = Math.max(MIN, Math.min(MAX, next));
    setScale(clamped);
    quizChannel.send({ type: 'DISPLAY_SCALE', payload: { scale: clamped } });
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/10 backdrop-blur px-1.5 py-1" title="Display text size">
      <ALargeSmall size={15} className="text-white/50 ml-1" />
      <button
        onClick={() => change(scale - STEP)}
        disabled={scale <= MIN}
        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
        aria-label="Shrink display text"
      >
        <Minus size={14} />
      </button>
      <span className="w-9 text-center text-xs font-semibold tabular-nums">{scale}%</span>
      <button
        onClick={() => change(scale + STEP)}
        disabled={scale >= MAX}
        className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/15 disabled:opacity-30"
        aria-label="Enlarge display text"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
