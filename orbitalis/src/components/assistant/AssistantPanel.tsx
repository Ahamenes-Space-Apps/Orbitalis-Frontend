import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { padId } from '@/lib/coords';
import { DURATION, EASE } from '@/lib/motion';
import {
  useRankedCandidates,
  useField,
} from '@/data/hooks';
import type {
  AssistantContextItem,
  AssistantSnapshot,
} from '@/data/assistant';
import { useAssistant } from '@/store/useAssistant';
import { useUi } from '@/store/useUi';
import { ContextChips } from './ContextChips';
import { MessageList } from './MessageList';
import { StarterPrompts, type StarterPrompt } from './StarterPrompts';
import { AssistantComposer } from './AssistantComposer';

const contextKey = (item: AssistantContextItem) => `${item.kind}:${item.id}`;

export function AssistantPanel() {
  const open = useAssistant((s) => s.open);
  const setOpen = useAssistant((s) => s.setOpen);
  const messages = useAssistant((s) => s.messages);
  const streamingId = useAssistant((s) => s.streamingId);
  const send = useAssistant((s) => s.send);
  const stop = useAssistant((s) => s.stop);
  const clear = useAssistant((s) => s.clear);

  const field = useField();
  const { ranked } = useRankedCandidates({ applyFilters: false });
  const selectedId = useUi((s) => s.selectedId);
  const select = useUi((s) => s.select);
  const epoch = useUi((s) => s.epoch);

  const [removed, setRemoved] = useState<string[]>([]);

  const candidate = ranked.find((c) => c.id === selectedId) ?? null;

  const context = useMemo<AssistantContextItem[]>(() => {
    const items: AssistantContextItem[] = [];

    if (field.data) {
      items.push({
        kind: 'field',
        id: field.data.id,
        label: field.data.name,
      });
    }
    if (candidate) {
      items.push({
        kind: 'candidate',
        id: String(candidate.id),
        label: `Candidate #${padId(candidate.id)}`,
      });
    }
    items.push({
      kind: 'frame',
      id: String(epoch),
      label: `Epoch ${epoch} of 3`,
    });

    return items;
  }, [field.data, candidate, epoch]);

  const activeContext = context.filter(
    (item) => !removed.includes(contextKey(item)),
  );

  const snapshot: AssistantSnapshot = {
    fieldName: field.data?.name ?? null,
    synthetic: field.data?.synthetic ?? false,
    candidate: candidate
      ? {
          id: candidate.id,
          rank: candidate.rank,
          score: candidate.score,
          cls: candidate.cls,
          displacementArcsec: candidate.displacementArcsec,
          rateArcsecPerYear: candidate.rateArcsecPerYear,
          detections: candidate.detections,
          knownObject: candidate.knownMatch?.object ?? null,
        }
      : null,
  };

  const starters = useMemo<StarterPrompt[]>(() => {
    if (candidate) {
      const ref = `#${padId(candidate.id)}`;
      const rank =
        candidate.rank === 1 ? 'ranked first' : `ranked #${candidate.rank}`;
      return [
        { label: `Why is ${ref} ${rank}?`, prompt: `Why is ${ref} ${rank}?` },
        { label: 'What does 1.70 µm mean?', prompt: 'What does 1.70 µm mean here?' },
        { label: 'How was this validated?', prompt: 'How was this validated?' },
        {
          label: 'What can this tool not tell me?',
          prompt: 'What can this tool not tell me?',
        },
      ];
    }

    return [
      { label: 'How are candidates ranked?', prompt: 'How are candidates ranked?' },
      { label: 'What does 1.70 µm mean?', prompt: 'What does 1.70 µm mean here?' },
      { label: 'How was this validated?', prompt: 'How was this validated?' },
      {
        label: 'What can this tool not tell me?',
        prompt: 'What can this tool not tell me?',
      },
    ];
  }, [candidate]);

  const streaming = streamingId !== null;

  function handleSend(prompt: string) {
    void send(prompt, activeContext, snapshot);
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="assistant-panel"
          aria-label="Assistant"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ duration: DURATION.base, ease: EASE }}
          className="flex w-[380px] max-w-full shrink-0 flex-col border-l border-line bg-bar"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Sparkles className="size-4 text-amber" aria-hidden="true" />
                Assistant
              </h2>
              <p className="m-0 mt-0.5 text-[11px] text-haze">
                Grounded in this field&apos;s stored results
              </p>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px] text-haze transition-colors hover:bg-panel-2 hover:text-ink"
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="grid size-7 cursor-pointer place-items-center rounded-md text-haze transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          {activeContext.length > 0 && (
            <div className="border-b border-line px-4 py-2.5">
              <ContextChips
                items={activeContext}
                onRemove={(item) =>
                  setRemoved((current) => [...current, contextKey(item)])
                }
              />
            </div>
          )}

          <MessageList
            messages={messages}
            streamingId={streamingId}
            onCandidate={select}
          />

          {messages.length === 0 && (
            <div className="px-4 pb-4">
              <StarterPrompts
                prompts={starters}
                onPick={handleSend}
                disabled={streaming}
              />
            </div>
          )}

          <div className="border-t border-line p-3">
            <AssistantComposer
              onSend={handleSend}
              onStop={stop}
              streaming={streaming}
            />

            <p className="m-0 mt-2 text-[10px] leading-normal text-haze">
              AI answer based on this field&apos;s stored results. Candidates are
              unconfirmed.
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
