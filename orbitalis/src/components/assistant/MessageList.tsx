import { useEffect, useRef } from 'react';
import { ScanSearch, Sparkles } from 'lucide-react';
import type { AssistantMessage } from '@/store/useAssistant';
import { cn } from '@/lib/utils';

const LINK_PATTERN = /(#\d{3})/g;

function MessageBody({
  content,
  onCandidate,
}: {
  content: string;
  onCandidate: (id: number) => void;
}) {
  return (
    <>
      {content.split('\n\n').map((paragraph, index) => (
        <p
          key={index}
          className="m-0 text-[14px] leading-relaxed whitespace-pre-line text-mist"
        >
          {paragraph.split(LINK_PATTERN).map((part, partIndex) => {
            if (!/^#\d{3}$/.test(part)) return <span key={partIndex}>{part}</span>;

            return (
              <button
                key={partIndex}
                type="button"
                onClick={() => onCandidate(Number(part.slice(1)))}
                className="cursor-pointer rounded-sm font-mono text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent-soft"
              >
                {part}
              </button>
            );
          })}
        </p>
      ))}
    </>
  );
}

function ToolCalls({ message }: { message: AssistantMessage }) {
  if (message.toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {message.toolCalls.map((call) => (
        <span
          key={call.name}
          className="inline-flex items-center gap-1 border border-line bg-canvas px-1.5 py-0.5 text-[9px] text-haze"
        >
          <ScanSearch className="size-3" aria-hidden="true" />
          {call.label}
        </span>
      ))}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="The assistant is thinking">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-pulse rounded-full bg-haze"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  );
}

export function MessageList({
  messages,
  streamingId,
  onCandidate,
}: {
  messages: AssistantMessage[];
  streamingId: string | null;
  onCandidate: (id: number) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, last?.content, last?.status]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="grid size-12 place-items-center rounded-full border border-line-2 bg-panel text-accent">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="m-0 text-[12px] font-semibold text-ink">
            Ask about this field
          </p>
          <p className="m-0 mt-1 text-[10px] leading-relaxed text-haze">
            Answers use the current selection and this field&apos;s stored results. Nothing is confirmed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="console-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent/30 bg-accent/12 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                {message.content}
              </div>
            </div>
          );
        }

        const thinking =
          message.status === 'streaming' &&
          message.content.length === 0 &&
          message.id === streamingId;

        return (
          <div key={message.id} className="flex gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line-2 bg-panel text-accent"
            >
              <Sparkles className="size-3" />
            </span>

            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col gap-2 rounded-2xl rounded-tl-md border border-line bg-panel px-3.5 py-3',
                message.status === 'error' && 'border-ink/40',
              )}
            >
              <ToolCalls message={message} />

              {thinking ? (
                <TypingDots />
              ) : (
                <MessageBody
                  content={message.content}
                  onCandidate={onCandidate}
                />
              )}

              {message.status === 'stopped' && (
                <span className="text-[11px] text-haze">Stopped</span>
              )}

              {message.status === 'error' && (
                <span className="text-[11px] text-ink" role="alert">
                  The assistant is unavailable right now. The rest of the app
                  keeps working.
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
