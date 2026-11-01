import { padId } from '@/lib/coords';
import type { CandidateDetail, Explanation } from './types';

/**
 * Offline stand-in for the backend's "why was this prioritised?" endpoint.
 * The real service sends the same structured candidate JSON to the Claude API and returns text of the same shape.
 * Rule for both: use only numbers that are in the candidate record, never add measurements.
 */
export function explainCandidate(c: CandidateDetail, pixelScaleArcsec: number): Explanation {
  const id = `#${padId(c.id)}`;
  const px = c.displacementArcsec / pixelScaleArcsec;
  const pxText = px < 1 ? `about ${px.toFixed(1)} of a pixel` : `about ${px.toFixed(1)} pixels`;
  const spectral = c.flaggedBands
    ? `Its spectrum departs from the field median in bands ${c.flaggedBands[0]} to ${c.flaggedBands[1]}, by up to ${c.peakDepartureSigma.toFixed(1)}σ.`
    : 'Its spectrum stays close to the field median.';

  const paragraphs: string[] = [];

  if (c.cls === 'moving') {
    const track = c.components.T >= 0.9 ? 'a straight-line track that fits well' : 'a track that fits less well';
    paragraphs.push(
      `Candidate ${id} moves ${c.displacementArcsec.toFixed(1)}″ in total across ${c.detections} epochs, ${pxText}, along ${track}. ${spectral}`,
    );
    if (c.knownMatch) {
      paragraphs.push(
        `It lies ${c.knownMatch.separationArcsec.toFixed(1)}″ from ${c.knownMatch.object} in ${c.knownMatch.catalog}, so it is most likely a known solar-system object. It stays in the list but is ranked lower.`,
      );
    } else {
      paragraphs.push(
        `No catalogued solar-system object, star or infrared source lies within 10″. Possible explanations include a slow solar-system body or a nearby star with high proper motion. Telling them apart needs follow-up astrometry.`,
      );
    }
  } else {
    paragraphs.push(
      `Candidate ${id} changed brightness by ${c.fluxChangePct >= 0 ? '+' : '−'}${Math.abs(c.fluxChangePct).toFixed(1)}% (${(c.variabilitySigma ?? 0).toFixed(1)}σ) while its position stayed within ${c.positionSigmaArcsec.toFixed(2)}″ of measurement error. ${spectral}`,
    );
    paragraphs.push(
      'That pattern is typical of a variable source. Instrumental effects, such as calibration differences between passes, have to be excluded before it is treated as real.',
    );
  }

  return {
    text: paragraphs.join('\n\n'),
    caveat: 'Written from the numbers on this page only. It cannot add measurements or confirm what the object is.',
    generatedBy: 'template (offline mock)',
  };
}
