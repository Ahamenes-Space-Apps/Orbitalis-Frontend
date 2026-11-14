export interface StarterPrompt {
  label: string;
  prompt: string;
}

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
      <span className="text-[11px] tracking-widest text-haze uppercase">
        Try asking
      </span>

      <div className="grid gap-2">
        {prompts.map((item) => (
          <button
            key={item.prompt}
            type="button"
            onClick={() => onPick(item.prompt)}
            disabled={disabled}
            className="cursor-pointer rounded-xl border border-line-2 bg-panel px-3 py-2 text-left text-[13px] text-mist transition-colors hover:border-accent-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
