import { motion } from 'framer-motion';

interface QuestionTimerProps {
  remaining: number;
  total: number;
  running: boolean;
  size?: number;
}

export function QuestionTimer({ remaining, total, running, size = 96 }: QuestionTimerProps) {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - pct);

  const color = remaining <= 3 ? '#E62323' : remaining <= 5 ? '#D4AF37' : '#00B5E2';
  const dramatic = remaining <= 3 && remaining > 0;

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={dramatic ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.6, repeat: dramatic ? Infinity : 0 }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={running ? dashoffset : 0}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <motion.span
        key={remaining}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="absolute font-display font-black text-3xl sm:text-4xl"
        style={{ color }}
      >
        {remaining}
      </motion.span>
    </motion.div>
  );
}
