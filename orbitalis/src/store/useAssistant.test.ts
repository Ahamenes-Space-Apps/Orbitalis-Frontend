import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/data/api';
import { useAssistant } from './useAssistant';

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}

function reset() {
  useAssistant.setState({
    open: false,
    messages: [],
    streamingId: null,
    error: null,
  });
}

const context = { field_id: 'f_test' };
const items = [{ kind: 'field' as const, id: 'f_test', label: 'Field f_test' }];

beforeEach(reset);
afterEach(() => {
  reset();
  vi.restoreAllMocks();
});

describe('assistant store', () => {
  it('streams token deltas and reports tool calls', async () => {
    vi.spyOn(api, 'chat').mockResolvedValue(
      sseResponse([
        'event: token\ndata: {"delta":"Stack "}\n\n',
        'event: tool_call\ndata: {"name":"list_candidates"}\n\n',
        'event: token\ndata: {"delta":"SNR ranks candidates."}\n\n',
        'event: done\ndata: {"status":"completed"}\n\n',
      ]),
    );

    await useAssistant.getState().send('What is the stack SNR?', context, items);

    const state = useAssistant.getState();
    expect(state.streamingId).toBeNull();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      role: 'user',
      content: 'What is the stack SNR?',
      status: 'done',
    });
    expect(state.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Stack SNR ranks candidates.',
      status: 'done',
    });
    expect(state.messages[1].toolCalls).toEqual([
      { name: 'list_candidates', label: 'looked up this field’s candidates' },
    ]);
    expect(api.chat).toHaveBeenCalledWith(
      [{ role: 'user', content: 'What is the stack SNR?' }],
      context,
      expect.any(AbortSignal),
    );
  });

  it('turns an SSE error event into ORB-AS copy', async () => {
    vi.spyOn(api, 'chat').mockResolvedValue(
      sseResponse([
        'event: error\ndata: {"code":"ORB-AS-002","message":"rate limited"}\n\n',
      ]),
    );

    await useAssistant.getState().send('Hello', context, items);

    const reply = useAssistant.getState().messages[1];
    expect(reply.status).toBe('error');
    expect(reply.error?.code).toBe('ORB-AS-002');
    expect(reply.error?.message).toMatch(/Too many questions/i);
    expect(reply.error?.message).toMatch(/Try again in a minute/i);
  });

  it('resends prior chat history with the new prompt', async () => {
    const chat = vi
      .spyOn(api, 'chat')
      .mockResolvedValue(
        sseResponse([
          'event: token\ndata: {"delta":"First answer"}\n\n',
          'event: done\ndata: {"status":"completed"}\n\n',
        ]),
      );

    await useAssistant.getState().send('First', context, items);
    await useAssistant.getState().send('Second', context, items);

    expect(chat).toHaveBeenLastCalledWith(
      [
        { role: 'user', content: 'First' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second' },
      ],
      context,
      expect.any(AbortSignal),
    );
  });
});
