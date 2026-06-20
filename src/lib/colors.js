// Shared identity palette for popup + settings.

export const PALETTE = [
  { name: 'coral', var: 'var(--c-coral)' },
  { name: 'sky', var: 'var(--c-sky)' },
  { name: 'lime', var: 'var(--c-lime)' },
  { name: 'amber', var: 'var(--c-amber)' },
  { name: 'violet', var: 'var(--c-violet)' },
  { name: 'teal', var: 'var(--c-teal)' },
];

/** Resolve display color from stored identity fields. */
export function resolveColor(identity, index = 0) {
  if (identity.color) return identity.color;
  const colorIndex = identity.colorIndex ?? (index % PALETTE.length);
  return PALETTE[colorIndex]?.var || PALETTE[0].var;
}
