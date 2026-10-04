import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import type { QuizQuestion } from '../../types/quiz';

export function ExplanationCard({ question }: { question: QuizQuestion }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 text-left space-y-3"
    >
      <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-bb-gold">Why?</p>
      <p className="text-white/85 leading-relaxed">{question.explanation}</p>
      {question.scriptureReference && (
        <div className="flex items-center gap-2 text-bb-cyan font-semibold pt-1">
          <BookOpen size={16} />
          {question.scriptureReference}
        </div>
      )}
    </motion.div>
  );
}
