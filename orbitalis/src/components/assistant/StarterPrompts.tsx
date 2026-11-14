export interface StarterPrompt {
  label: string;
  prompt: string;
}

/**
 * The five starter questions from the backend knowledge pack
 * (`config/knowledge/starter_questions.md`). They cover only documented
 * capabilities, and every answer still carries the unconfirmed footnote.
 */
export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    label: 'What does this candidate’s stack SNR mean?',
    prompt: "What does this candidate's stack SNR mean?",
  },
  {
    label: 'How should I read the model score next to this candidate?',
    prompt: 'How should I read the model score next to this candidate?',
  },
  {
    label: 'How do I know how well the search actually works?',
    prompt: 'How do I know how well the search actually works?',
  },
  {
    label: 'Which pixels are masked, and what do the flag bits mean?',
    prompt: 'Which pixels are masked, and what do the flag bits mean?',
  },
  {
    label: 'What is the difference between observed, predicted and candidate positions?',
    prompt: 'What is the difference between observed, predicted and candidate positions?',
  },
];

export function StarterPrompts({
  prompts,
  onPick,
  disabled,
}: {
  prompts: StarterPrompt[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2" aria-label="Starter questions">
      <span className="text-[11px] tracking-widest text-haze uppercase">Try asking</span>

      <div className="grid gap-2">
        {prompts.map((item) => (
          <button
            key={item.prompt}
            type="button"
            onClick={() => onPick(item.prompt)}
            disabled={disabled}
            className="cursor-pointer rounded-xl border border-line-2 bg-panel px-3 py-2 text-left text-[13px] text-mist transition-colors hover:border-[#4a5b7f] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
