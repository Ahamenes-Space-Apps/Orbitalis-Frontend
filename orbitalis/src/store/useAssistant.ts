import { create } from 'zustand';
import {
  buildMockReply,
  streamText,
  type AssistantContextItem,
  type AssistantSnapshot,
  type AssistantToolCall,
} from '@/data/assistant';

export type AssistantMessageStatus = 'streaming' | 'done' | 'stopped' | 'error';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context: AssistantContextItem[];
  toolCalls: AssistantToolCall[];
  status: AssistantMessageStatus;
  createdAt: number;
}

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  streamingId: string | null;
  error: string | null;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  send: (
    prompt: string,
    context: AssistantContextItem[],
    snapshot: AssistantSnapshot,
  ) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

let sequence = 0;
let controller: AbortController | null = null;

function nextId() {
  sequence += 1;
  return `msg-${sequence}-${Date.now()}`;
}

export const useAssistant = create<AssistantState>((set, get) => ({
  open: false,
  messages: [],
  streamingId: null,
  error: null,

  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),

  send: async (prompt, context, snapshot) => {
    const text = prompt.trim();
    if (!text || get().streamingId) return;

    const userMessage: AssistantMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      context,
      toolCalls: [],
      status: 'done',
      createdAt: Date.now(),
    };

    const reply = buildMockReply(text, snapshot);
    const assistantMessage: AssistantMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      context,
      toolCalls: reply.toolCalls,
      status: 'streaming',
      createdAt: Date.now(),
    };

    set((s) => ({
      open: true,
      error: null,
      messages: [...s.messages, userMessage, assistantMessage],
      streamingId: assistantMessage.id,
    }));

    controller = new AbortController();
    const signal = controller.signal;

    try {
      await streamText(reply.text, signal, (chunk) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        }));
      });
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMessage.id ? { ...m, status: 'done' } : m,
        ),
        streamingId: null,
      }));
    } catch {
      const stopped = signal.aborted;
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                status: stopped ? 'stopped' : 'error',
                content:
                  m.content ||
                  (stopped
                    ? ''
                    : 'The assistant is unavailable right now. The rest of the app keeps working.'),
              }
            : m,
        ),
        error: stopped ? null : 'The assistant is unavailable right now.',
        streamingId: null,
      }));
    } finally {
      controller = null;
    }
  },

  stop: () => controller?.abort(),

  clear: () => {
    controller?.abort();
    set({ messages: [], streamingId: null, error: null });
  },
}));
