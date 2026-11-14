import { create } from 'zustand';
import { api, parseSse } from '@/data/api';
import { ApiError, ERROR_COPY } from '@/data/errors';
import type { ChatContext, ChatMessage } from '@/data/types';

export type AssistantMessageStatus = 'streaming' | 'done' | 'stopped' | 'error';

export type AssistantContextKind = 'field' | 'candidate' | 'frame';

export interface AssistantContextItem {
  kind: AssistantContextKind;
  id: string;
  label: string;
}

export interface AssistantToolCall {
  name: string;
  label: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  context: AssistantContextItem[];
  toolCalls: AssistantToolCall[];
  status: AssistantMessageStatus;
  /** Assistant error copy (ORB-AS-*), kept on the message that failed. */
  error: { code: string; message: string } | null;
  createdAt: number;
}

interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  streamingId: string | null;
  error: string | null;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  send: (prompt: string, context: ChatContext, items: AssistantContextItem[]) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  list_candidates: 'looked up this field’s candidates',
  read_experiment_results: 'read the validation experiments',
  explain_flags: 'explained the mask flags',
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replaceAll('_', ' ');
}

let sequence = 0;
let controller: AbortController | null = null;

function nextId() {
  sequence += 1;
  return `msg-${sequence}-${Date.now()}`;
}

function errorCopy(error: unknown): { code: string; message: string } {
  if (error instanceof ApiError) {
    const copy = ERROR_COPY[error.code];
    return {
      code: error.code,
      message: copy
        ? `${copy.title} ${copy.recovery ?? copy.body}`.trim()
        : error.message,
    };
  }
  return {
    code: 'ORB-AS-001',
    message: `${ERROR_COPY['ORB-AS-001'].title} ${ERROR_COPY['ORB-AS-001'].body}`,
  };
}

export const useAssistant = create<AssistantState>((set, get) => ({
  open: false,
  messages: [],
  streamingId: null,
  error: null,

  setOpen: (open) => set({ open }),
  toggle: () => set((state) => ({ open: !state.open })),

  send: async (prompt, context, items) => {
    const text = prompt.trim().slice(0, 4000);
    if (!text || get().streamingId) return;

    // The server accepts at most 20 user/assistant messages. Resend the
    // visible history (empty assistant shells are not useful grounding) plus
    // the new prompt.
    const history: ChatMessage[] = get()
      .messages.filter((message) => message.content.trim().length > 0)
      .slice(-19)
      .map((message) => ({ role: message.role, content: message.content.slice(0, 4000) }));

    const userMessage: AssistantMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      context: items,
      toolCalls: [],
      status: 'done',
      error: null,
      createdAt: Date.now(),
    };

    const reply: AssistantMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      context: items,
      toolCalls: [],
      status: 'streaming',
      error: null,
      createdAt: Date.now(),
    };

    set((state) => ({
      open: true,
      error: null,
      messages: [...state.messages, userMessage, reply],
      streamingId: reply.id,
    }));

    controller = new AbortController();
    const signal = controller.signal;

    const patch = (changes: Partial<AssistantMessage>) =>
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === reply.id ? { ...message, ...changes } : message,
        ),
      }));

    try {
      const response = await api.chat([...history, { role: 'user', content: text }], context, signal);
      let finished = false;

      for await (const event of parseSse(response, signal)) {
        if (signal.aborted) break;
        const data = (event.data ?? {}) as Record<string, unknown>;

        if (event.event === 'token') {
          const delta = typeof data.delta === 'string' ? data.delta : '';
          if (delta) {
            set((state) => ({
              messages: state.messages.map((message) =>
                message.id === reply.id
                  ? { ...message, content: message.content + delta }
                  : message,
              ),
            }));
          }
        } else if (event.event === 'tool_call') {
          const name = typeof data.name === 'string' ? data.name : 'tool';
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === reply.id && !message.toolCalls.some((call) => call.name === name)
                ? {
                    ...message,
                    toolCalls: [...message.toolCalls, { name, label: toolLabel(name) }],
                  }
                : message,
            ),
          }));
        } else if (event.event === 'done') {
          finished = true;
          patch({ status: 'done' });
          break;
        } else if (event.event === 'error') {
          const code = typeof data.code === 'string' ? data.code : 'ORB-AS-001';
          const copy = ERROR_COPY[code];
          const message = copy
            ? `${copy.title} ${copy.recovery ?? copy.body}`.trim()
            : typeof data.message === 'string'
              ? data.message
              : ERROR_COPY['ORB-AS-001'].title;
          patch({ status: 'error', error: { code, message } });
          set({ error: message });
          break;
        }
      }

      if (!finished && !signal.aborted) {
        const current = get().messages.find((message) => message.id === reply.id);
        if (current?.status === 'streaming') {
          if (current.content.trim()) {
            patch({ status: 'done' });
          } else {
            const copy = ERROR_COPY['ORB-AS-004'];
            patch({
              status: 'error',
              error: { code: 'ORB-AS-004', message: `${copy.title} ${copy.body}` },
            });
            set({ error: `${copy.title} ${copy.body}` });
          }
        }
      }
    } catch (error) {
      if (signal.aborted) {
        patch({ status: 'stopped' });
      } else {
        const copy = errorCopy(error);
        patch({ status: 'error', error: copy });
        set({ error: copy.message });
      }
    } finally {
      controller = null;
      set({ streamingId: null });
    }
  },

  stop: () => controller?.abort(),

  clear: () => {
    controller?.abort();
    set({ messages: [], streamingId: null, error: null });
  },
}));
