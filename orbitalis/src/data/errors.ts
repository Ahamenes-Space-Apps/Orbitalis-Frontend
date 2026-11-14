/**
 * The one error shape the UI reasons about. `code` is the SDD registry code
 * (ORB-...), `detail` is passed through only for developer-facing notes.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: unknown;

  constructor(code: string, message: string, status = 0, detail: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

/** Plain-language copy for every code in UX §8.3. */
export const ERROR_COPY: Record<string, { title: string; body: string; recovery?: string }> = {
  'ORB-API-001': { title: 'Check the highlighted fields.', body: 'The request was not valid.', recovery: 'Fix the input and submit again.' },
  'ORB-API-002': { title: "We can't find that item.", body: 'It may have been cleared from this server.', recovery: 'Rebuild the view from the URL parameters.' },
  'ORB-API-003': { title: 'That run has already finished.', body: 'No further action is needed.' },
  'ORB-GW-001': { title: "The archive didn't respond in time.", body: 'The observations could not be retrieved.', recovery: 'Retry in a moment.' },
  'ORB-GW-002': { title: "The archive didn't respond in time.", body: 'The observations could not be retrieved.', recovery: 'Retry in a moment.' },
  'ORB-GW-003': { title: 'The archive is busy.', body: 'Requests are paused for a moment.', recovery: 'Retrying automatically.' },
  'ORB-GW-004': { title: "The archive didn't respond in time.", body: 'The observations could not be retrieved.', recovery: 'Retry in a moment.' },
  'ORB-PL-001': { title: 'Processing failed for this field.', body: 'The build stopped before it finished.', recovery: 'Retry, or copy the details for a report.' },
  'ORB-PL-002': { title: 'Too many fields are being built right now.', body: 'The build queue is full.', recovery: 'Try again in a minute.' },
  'ORB-PL-003': { title: 'Loading was cancelled.', body: 'Frames already received stay usable.', recovery: 'Resume the build.' },
  'ORB-ST-001': { title: 'Storage problem.', body: 'Results may load more slowly.', recovery: 'Retry.' },
  'ORB-ST-002': { title: 'Storage problem.', body: 'Results may load more slowly.', recovery: 'Retry.' },
  'ORB-CORE-001': { title: 'One observation file was unreadable and was skipped.', body: 'The rest of the field is still usable.' },
  'ORB-CORE-002': { title: 'No usable pixels remain here after quality masking.', body: 'This region is fully masked.', recovery: 'Choose another region.' },
  'ORB-OV-001': { title: 'Known-object overlay is unavailable right now.', body: 'The layer has been disabled.' },
  'ORB-JOB-002': { title: 'The analysis queue is full.', body: 'A run is already queued or running.', recovery: 'Try again in a minute.' },
  'ORB-JOB-003': { title: 'The search took too long and was stopped.', body: 'No result was produced.', recovery: 'Narrow the motion range or use fewer frames.' },
  'ORB-JOB-004': { title: 'The server restarted during your search.', body: 'Earlier work is kept.', recovery: 'Run it again.' },
  'ORB-RS-001': { title: 'Wait for the field to finish loading before searching.', body: 'The search needs usable frames.' },
  'ORB-RS-002': { title: "Some selected frames can't be combined.", body: 'The stack policy rejected part of the selection.', recovery: 'Edit the frame selection.' },
  'ORB-RS-003': { title: 'That search is too large.', body: 'It exceeds the work budget.', recovery: 'Narrow the motion range, radius or density.' },
  'ORB-ML-001': { title: "Ranking isn't available.", body: 'Results are ordered by stack SNR.' },
  'ORB-ML-002': { title: 'Ranking failed.', body: 'Candidates are shown unranked.' },
  'ORB-MOCK-001': {
    title: 'Mock mode only contains the six demo presets.',
    body: 'It cannot build an arbitrary position.',
    recovery: 'Open a preset, or point VITE_API_URL at the real backend.',
  },
  'ORB-AS-001': { title: 'The assistant is unavailable right now.', body: 'The rest of the app keeps working.' },
  'ORB-AS-002': { title: 'Too many questions.', body: 'The assistant is rate-limited.', recovery: 'Try again in a minute.' },
  'ORB-AS-003': { title: 'The daily assistant limit is used up.', body: 'The limit resets tomorrow.' },
  'ORB-AS-004': { title: 'The assistant is unavailable right now.', body: 'The rest of the app keeps working.' },
  'ORB-SYS-001': { title: 'Something went wrong on our side.', body: 'The request id below can help with a report.', recovery: 'Retry.' },
  'ORB-SYS-002': { title: "ORBITALIS can't load its data.", body: 'The data bundle is unavailable.', recovery: 'Try again.' },
};

export function errorCopy(error: unknown): { title: string; body: string; recovery?: string; code: string } {
  if (error instanceof ApiError) {
    const known = ERROR_COPY[error.code];
    return known
      ? { ...known, code: error.code }
      : { title: error.message, body: 'The request failed.', code: error.code };
  }
  return {
    title: "The archive didn't respond in time.",
    body: 'Check your connection, or retry in a moment.',
    recovery: 'Retry.',
    code: 'ORB-GW-001',
  };
}
