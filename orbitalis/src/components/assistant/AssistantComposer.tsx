import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { CornerDownLeft, SendHorizontal, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AssistantComposer({
  onSend,
  onStop,
  streaming,
}: {
  onSend: (prompt: string) => void;
  onStop: () => void;
  streaming: boolean;
}) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setValue('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="sr-only" htmlFor="assistant-input">
        Ask the assistant
      </label>

      <textarea
        id="assistant-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        maxLength={4000}
        placeholder="Ask about this field or selection…"
        className="w-full resize-none rounded-xl border border-line-2 bg-panel px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-haze focus-visible:border-cyan"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[11px] text-haze">
          <CornerDownLeft className="size-3" aria-hidden="true" />
          Enter to send · Shift + Enter for a new line
        </span>

        {streaming ? (
          <Button type="button" variant="outline" size="sm" onClick={onStop}>
            <Square className="size-3" aria-hidden="true" />
            Stop
          </Button>
        ) : (
          <Button type="submit" size="sm" disabled={!trimmed}>
            <SendHorizontal className="size-3.5" aria-hidden="true" />
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
