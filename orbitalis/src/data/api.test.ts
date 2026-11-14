import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, DEFAULT_SEARCH, parseSse, searchJob, usingMockApi } from './api';

/** Load a fresh copy of the client with VITE_API_URL set, so it talks to `fetch`. */
async function liveClient(url = 'https://api.test/api/v1') {
  vi.stubEnv('VITE_API_URL', url);
  vi.resetModules();
  return import('./api');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

async function collect(response: Response) {
  const events: Array<{ event: string; data: unknown; id?: string }> = [];
  for await (const event of parseSse(response)) events.push(event);
  return events;
}

// `setup.ts` installs the bundle-serving fetch shim before this module loads.
const bundleFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = bundleFetch;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('searchJob', () => {
  it('wraps motion parameters in a moving-object job payload', () => {
    const job = searchJob('f_abc', { ...DEFAULT_SEARCH, rank: true });
    expect(job).toEqual({
      kind: 'moving_object_search',
      field_id: 'f_abc',
      params: { ...DEFAULT_SEARCH, rank: true },
    });
  });
});

describe('parseSse', () => {
  it('parses named events, ids and JSON data across chunk boundaries', async () => {
    const events = await collect(
      sseResponse([
        'id: 1\nevent: progress\ndata: {"done":1',
        ',"total":2}\n\n',
        ': keep-alive\n\nevent: done\ndata: {"ok":true}\n\n',
      ]),
    );

    expect(events).toEqual([
      { event: 'progress', data: { done: 1, total: 2 }, id: '1' },
      { event: 'done', data: { ok: true }, id: undefined },
    ]);
  });

  it('joins multi-line data and keeps non-JSON payloads as text', async () => {
    const events = await collect(
      sseResponse(['event: note\ndata: line one\ndata: line two\n\n']),
    );
    expect(events).toEqual([{ event: 'note', data: 'line one\nline two', id: undefined }]);
  });

  it('rejects a response without a body', async () => {
    const response = new Response(null, { status: 204 });
    await expect(collect(response)).rejects.toMatchObject({ code: 'ORB-GW-001' });
  });
});

describe('mock client', () => {
  it('is the default in tests', () => {
    expect(usingMockApi).toBe(true);
  });

  it('serves the demo capabilities with optional features disabled', async () => {
    const envelope = await api.capabilities();
    expect(envelope.data.ranking.enabled).toBe(false);
    expect(envelope.data.assistant.enabled).toBe(false);
    expect(envelope.data.classification.enabled).toBe(false);
  });

  it('creates a field from a preset id', async () => {
    const envelope = await api.createField({ preset: 'tutorial' });
    expect(envelope.data.field_id).toBe('f_25faaae4bee9c18ab8c3ce82');
    expect(envelope.data.params.preset).toBe(true);
  });

  it('sorts candidates by stack SNR when ranking is unavailable', async () => {
    const envelope = await api.candidates('f_25faaae4bee9c18ab8c3ce82', 'stack_snr');
    const snrs = envelope.data.candidates.map((candidate) => candidate.stack_snr);
    expect(snrs.length).toBeGreaterThan(0);
    expect(snrs).toEqual([...snrs].sort((a, b) => b - a));
  });

  it('raises a typed error for an unknown field', async () => {
    await expect(api.field('f_missing')).rejects.toMatchObject({
      code: 'ORB-API-002',
      status: 404,
    });
  });

  it('explains that mock mode cannot build arbitrary coordinates', async () => {
    await expect(api.createField({ ra: 0, dec: 0 })).rejects.toMatchObject({
      code: 'ORB-MOCK-001',
      status: 422,
    });
  });

  it('keeps demo cutout and stack URLs inside /mock/images', () => {
    expect(api.candidateStack('f_a', 'c_b')).toBe('/mock/images/f_a/stack-c_b.png');
    expect(api.candidateCutout('f_a', 'c_b', 'fr_1')).toBe('/mock/images/f_a/cutout-c_b-fr_1.png');
  });
});

describe('live client', () => {
  it('reads successful envelopes and encodes opaque ids', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: { frames: [] }, meta: {} }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const live = await liveClient();
    expect(live.usingMockApi).toBe(false);
    await live.api.candidateFrames('c/with space');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/candidates/c%2Fwith%20space/frames',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('surfaces the error envelope as an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { error: { code: 'ORB-PL-002', message: 'The build queue is full.', detail: { queue: 10 } } },
          429,
        ),
      ),
    );
    const live = await liveClient();
    const { ApiError: LiveApiError } = await import('./errors');

    const failure = live.api.createField({ preset: 'tutorial' });
    await expect(failure).rejects.toBeInstanceOf(LiveApiError);
    await expect(failure).rejects.toMatchObject({
      code: 'ORB-PL-002',
      status: 429,
      message: 'The build queue is full.',
      detail: { queue: 10 },
    });
  });

  it('uses a system error when the failure body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway down', { status: 502 })));
    const live = await liveClient();
    await expect(live.api.health()).rejects.toMatchObject({ code: 'ORB-SYS-001', status: 502 });
  });

  it('reports an unreachable API as a gateway error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const live = await liveClient();
    await expect(live.api.health()).rejects.toMatchObject({ code: 'ORB-GW-001', status: 0 });
  });

  it('posts JSON bodies with the right content type', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ data: { kind: 'moving_object_search', field_id: 'f_a', work: 1, budget: 2, ok: true, frames: 1, motion_vectors: 1 }, meta: {} }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const live = await liveClient();
    await live.api.estimate(searchJob('f_a', DEFAULT_SEARCH));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/jobs/estimate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });
});
