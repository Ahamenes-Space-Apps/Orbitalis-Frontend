import { padId } from '@/lib/coords';

/**
 * Frontend-only assistant.
 *
 * There is no backend yet, so replies are generated locally from the current
 * field and selection and streamed word by word. The shape of this module is
 * kept close to the SDD contract so swapping it for a real `/assistant/chat`
 * stream later only touches this file.
 */

export type AssistantContextKind = 'field' | 'candidate' | 'frame';

export interface AssistantContextItem {
  kind: AssistantContextKind;
  id: string;
  label: string;
}

export interface AssistantCandidateSnapshot {
  id: number;
  rank: number;
  score: number;
  cls: 'moving' | 'variable';
  displacementArcsec: number;
  rateArcsecPerYear: number;
  detections: number;
  knownObject: string | null;
}

export interface AssistantSnapshot {
  fieldName: string | null;
  synthetic: boolean;
  candidate: AssistantCandidateSnapshot | null;
}

export interface AssistantToolCall {
  name: string;
  label: string;
}

export interface AssistantReply {
  text: string;
  toolCalls: AssistantToolCall[];
}

const STREAM_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 22;

function candidateReply(c: AssistantCandidateSnapshot): AssistantReply {
  const ref = `#${padId(c.id)}`;
  const known = c.knownObject
    ? `It also matches a known object (${c.knownObject}), which lowers its score. A match is not a failure — most movers in real fields are known solar-system objects.`
    : 'No catalog match was found within 10 arcseconds, but that is not proof of novelty: catalogs are incomplete at faint magnitudes.';

  return {
    text: `Candidate ${ref} sits at rank ${c.rank} with a priority score of ${c.score.toFixed(2)}.

The score is a model prediction built from motion, brightness change, spectral anomaly and temporal consistency. It ranks candidates for inspection; it does not confirm anything.

It is classified as ${c.cls}, displaced by ${c.displacementArcsec.toFixed(1)}″ over ${c.detections} epochs (about ${c.rateArcsecPerYear.toFixed(1)}″ per year). ${known}

Open the dossier to compare the stack against the original epoch frames. The movement in the originals is the evidence that matters.`,
    toolCalls: [{ name: 'lookup_candidate', label: `looked up candidate ${ref}` }],
  };
}

function wavelengthReply(): AssistantReply {
  return {
    text: `Each SPHEREx exposure captures the sky at one infrared wavelength, measured in micrometres. The 1.70 µm point is a single band inside the 0.75–5.0 µm range shown on the spectrum.

Wavelength matters because a moving object's colour can differ from the stationary background, and the spectrum is measured band by band. The chart shows relative flux against the field median, not an absolute calibration.`,
    toolCalls: [{ name: 'read_field_metadata', label: 'read field metadata' }],
  };
}

function validationReply(): AssistantReply {
  return {
    text: `Validation injects synthetic sources with known positions and brightness into real data, then measures how many the search recovers.

The Methods and limits tab reports recall, precision against those injected sources, position error, and completeness against brightness and speed. Those numbers apply to that experiment only — they are not a guarantee for every field.`,
    toolCalls: [{ name: 'read_experiments', label: 'read validation experiments' }],
  };
}

function limitsReply(): AssistantReply {
  return {
    text: `Here is what this tool cannot tell you.

A candidate is a candidate, not a confirmed detection. Follow-up observations are required.

The score ranks candidates for inspection. It is a prediction, not a probability that something is a planet.

Real shifts are often sub-pixel, so the sky view exaggerates motion and states by how much.

Only the selected field and release are searched, and a catalog non-match is not proof of novelty.`,
    toolCalls: [{ name: 'read_methods', label: 'read methods and limits' }],
  };
}

function defaultReply(snapshot: AssistantSnapshot): AssistantReply {
  const field = snapshot.fieldName
    ? `the field ${snapshot.fieldName}`
    : 'the current field';
  return {
    text: `I can help with ${field} and whatever is selected. Ask about a candidate's rank, the spectrum, how validation works, or what the tool cannot claim.

Answers use only this field's stored results. Candidates are unconfirmed.`,
    toolCalls: [{ name: 'read_field_metadata', label: 'read field metadata' }],
  };
}

export function buildMockReply(
  prompt: string,
  snapshot: AssistantSnapshot,
): AssistantReply {
  const q = prompt.toLowerCase();

  if (snapshot.candidate && (q.includes('rank') || q.includes('#') || q.includes('why'))) {
    return candidateReply(snapshot.candidate);
  }
  if (q.includes('µm') || q.includes('um') || q.includes('wavelength') || q.includes('band')) {
    return wavelengthReply();
  }
  if (q.includes('valid') || q.includes('recall') || q.includes('precision') || q.includes('complete')) {
    return validationReply();
  }
  if (q.includes('cannot') || q.includes('can\'t') || q.includes('limit') || q.includes('not tell')) {
    return limitsReply();
  }
  return defaultReply(snapshot);
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/** Streams a reply word by word, honouring an AbortSignal so Stop is instant. */
export async function streamText(
  text: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await delay(STREAM_DELAY_MS, signal);
    onChunk(chunk);
  }
}
