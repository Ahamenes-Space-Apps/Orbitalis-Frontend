import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { paletteDark, paletteLight } from '@/lib/palette';

// Vitest runs from the package root, so the theme file is a predictable relative path.
const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

const TOKEN: Record<string, string> = {
  field: '--t-field',
  bar: '--t-bar',
  panel: '--t-panel',
  panel2: '--t-panel2',
  line: '--t-line',
  line2: '--t-line2',
  ink: '--t-ink',
  mist: '--t-mist',
  haze: '--t-haze',
  slate: '--t-slate',
  accent: '--t-accent',
  accentSoft: '--t-accent-soft',
  accent2: '--t-accent2',
  star: '--t-star',
  warn: '--t-warn',
};

/** The declarations inside the first block whose selector list contains `selector`. */
function block(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `${selector} block is missing`).toBeGreaterThan(-1);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

function expectMirrors(scope: string, palette: Record<string, string>) {
  const declarations = block(scope);
  for (const [key, value] of Object.entries(palette)) {
    const token = TOKEN[key];
    const match = declarations.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6,8});`));
    expect(match, `${token} is missing from ${scope}`).not.toBeNull();
    expect(match![1].toLowerCase(), token).toBe(value);
  }
}

describe('palette', () => {
  it('mirrors the dark theme in index.css', () => {
    expectMirrors(':root', paletteDark);
  });

  it('mirrors the light theme in index.css', () => {
    expectMirrors('.light', paletteLight);
  });
});
