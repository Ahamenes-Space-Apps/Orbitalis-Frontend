import { Sparkles } from 'lucide-react';
import { useAssistant } from '@/store/useAssistant';

export function AssistantLauncher() {
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  const hasMessages = useAssistant((s) => s.messages.length > 0);

  if (open) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed right-4 bottom-4 z-30 inline-flex h-9 cursor-pointer items-center gap-2 border border-line-2 bg-panel px-3 text-[11px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
    >
      <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
      Ask the assistant
      {hasMessages && <span aria-hidden="true" className="size-1.5 bg-accent" />}
    </button>
  );
}
