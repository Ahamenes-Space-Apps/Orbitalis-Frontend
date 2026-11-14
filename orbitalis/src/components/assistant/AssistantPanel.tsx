import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { DURATION, EASE } from '@/lib/motion';
import {
  formatDec,
  formatId,
  formatMjdDate,
  formatRa,
  formatWavelength,
} from '@/lib/format';
import { useCandidates, useField, useFrames } from '@/data/hooks';
import type { ChatContext } from '@/data/types';
import { useUrlState } from '@/state/urlState';
import {
  useAssistant,
  type AssistantContextItem,
} from '@/store/useAssistant';
import { ContextChips } from './ContextChips';
import { MessageList } from './MessageList';
import { STARTER_PROMPTS, StarterPrompts } from './StarterPrompts';
import { AssistantComposer } from './AssistantComposer';

const contextKey = (item: AssistantContextItem) => `${item.kind}:${item.id}`;

export function AssistantPanel() {
  const open = useAssistant((state) => state.open);
  const setOpen = useAssistant((state) => state.setOpen);
  const messages = useAssistant((state) => state.messages);
  const streamingId = useAssistant((state) => state.streamingId);
  const send = useAssistant((state) => state.send);
  const stop = useAssistant((state) => state.stop);
  const clear = useAssistant((state) => state.clear);

  const { values, update } = useUrlState();
  const field = useField(values.f);
  const frames = useFrames(values.f);
  const candidates = useCandidates(values.f);

  const [removed, setRemoved] = useState<string[]>([]);

  const candidateList = candidates.data?.data.candidates ?? [];
  const selectedCandidate =
    candidateList.find((candidate) => candidate.candidate_id === values.sel) ?? null;
  const selectedFrame =
    (frames.data?.data.frames ?? []).find((frame) => frame.frame_ref === values.t) ?? null;

  const context = useMemo<AssistantContextItem[]>(() => {
    const items: AssistantContextItem[] = [];
    const fieldData = field.data?.data;

    if (fieldData) {
      const presetLabel = fieldData.params.preset ? 'Preset field' : 'Field';
      items.push({
        kind: 'field',
        id: fieldData.field_id,
        label: `${presetLabel} · ${formatRa(fieldData.params.ra)} · ${formatDec(fieldData.params.dec)}`,
      });
    }

    if (selectedCandidate) {
      items.push({
        kind: 'candidate',
        id: selectedCandidate.candidate_id,
        label: `Candidate ${formatId(selectedCandidate.ordinal)}`,
      });
    }

    if (selectedFrame) {
      items.push({
        kind: 'frame',
        id: selectedFrame.frame_ref,
        label: `Frame ${formatMjdDate(selectedFrame.mjd)} · ${formatWavelength(
          selectedFrame.wavelength_um,
        )}`,
      });
    }

    return items;
  }, [field.data, selectedCandidate, selectedFrame]);

  const activeContext = context.filter((item) => !removed.includes(contextKey(item)));

  const chatContext = useMemo<ChatContext>(() => {
    const focused = (kind: AssistantContextItem['kind']) =>
      activeContext.find((item) => item.kind === kind)?.id ?? null;
    return {
      field_id: focused('field'),
      frame_ref: focused('frame'),
      candidate_id: focused('candidate'),
    };
  }, [activeContext]);

  const streaming = streamingId !== null;

  function handleSend(prompt: string) {
    void send(prompt, chatContext, activeContext);
  }

  function handleCandidate(ordinal: number) {
    const match = candidateList.find((candidate) => candidate.ordinal === ordinal);
    if (match) update({ sel: match.candidate_id });
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
          className="flex min-h-0 w-[380px] max-w-full shrink-0 flex-col border-l border-line bg-bar"
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
                onRemove={(item) => setRemoved((current) => [...current, contextKey(item)])}
              />
            </div>
          )}

          <MessageList
            messages={messages}
            streamingId={streamingId}
            onCandidate={handleCandidate}
          />

          {messages.length === 0 && (
            <div className="px-4 pb-4">
              <StarterPrompts prompts={STARTER_PROMPTS} onPick={handleSend} disabled={streaming} />
            </div>
          )}

          <div className="border-t border-line p-3">
            <AssistantComposer onSend={handleSend} onStop={stop} streaming={streaming} />

            <p className="m-0 mt-2 text-[10px] leading-normal text-haze">
              AI answer based on this field&apos;s stored results. Candidates are unconfirmed.
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
