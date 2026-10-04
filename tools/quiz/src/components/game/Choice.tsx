import clsx from 'clsx';
import { Check, X } from 'lucide-react';

interface ChoiceProps {
  label: string;
  text: string;
  selected?: boolean;
  revealed?: boolean;
  correct?: boolean;
  incorrectPick?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function Choice({ label, text, selected, revealed, correct, incorrectPick, onClick, disabled }: ChoiceProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 text-left text-lg sm:text-xl transition flex items-center gap-4 w-full',
        revealed && correct && 'border-bb-green bg-bb-green/15 shadow-glow-green',
        revealed && incorrectPick && !correct && 'border-bb-red bg-bb-red/15 shadow-glow-red',
        revealed && !correct && !incorrectPick && 'border-white/10 bg-white/5 opacity-60',
        !revealed && selected && 'border-bb-gold bg-bb-gold/10 shadow-glow-gold',
        !revealed && !selected && 'border-white/15 bg-white/5 hover:border-bb-cyan/40 hover:bg-white/10',
        disabled && !revealed && 'cursor-default',
      )}
    >
      <span
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display font-black text-white',
          revealed && correct ? 'bg-bb-green' : revealed && incorrectPick ? 'bg-bb-red' : selected ? 'bg-bb-gold text-bb-deep' : 'bg-bb-blue',
        )}
      >
        {label}
      </span>
      <span className="flex-1 font-medium">{text}</span>
      {revealed && correct && <Check className="text-bb-green" />}
      {revealed && incorrectPick && !correct && <X className="text-bb-red" />}
    </button>
  );
}
