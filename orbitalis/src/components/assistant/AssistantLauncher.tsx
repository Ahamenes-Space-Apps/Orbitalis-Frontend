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
      className="fixed right-6 bottom-6 z-30 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-amber/50 bg-panel px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-colors hover:border-amber hover:bg-panel-2"
    >
      <Sparkles className="size-4 text-amber" aria-hidden="true" />
      Ask the assistant
      {hasMessages && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-amber"
        />
      )}
    </button>
  );
}
