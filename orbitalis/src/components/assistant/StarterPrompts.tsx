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
    <div className="flex flex-col gap-1.5" aria-label="Starter questions">
      <span className="text-[9px] tracking-[0.12em] text-haze uppercase">Try asking</span>

      <div className="grid gap-1">
        {prompts.map((item) => (
          <button
            key={item.prompt}
            type="button"
            onClick={() => onPick(item.prompt)}
            disabled={disabled}
            className="cursor-pointer border border-line bg-canvas px-2 py-1.5 text-left text-[10px] text-mist transition-colors hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
