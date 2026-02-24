/**
 * Color palette definitions for the dashboard.
 * The "vik" palette is a diverging blue-white-red scheme.
 * The "lajolla" palette is a sequential yellow-brown-black scheme.
 */

/** Vik diverging palette (blue → white → red) */
export const vikPalette: string[] = [
  '#001260',
  '#02255e',
  '#053a62',
  '#0a4d6a',
  '#0e6176',
  '#107483',
  '#148891',
  '#1c9c9b',
  '#34aea2',
  '#58bea7',
  '#7dcbad',
  '#9ed6b6',
  '#bde0c3',
  '#d7e8d5',
  '#eceeed',
  '#eee1d0',
  '#ebd0aa',
  '#e5bb82',
  '#dea35b',
  '#d68a3c',
  '#cc6f27',
  '#be541b',
  '#ad3a14',
  '#982412',
  '#801517',
]

/** La Jolla sequential palette (light yellow → dark brown) */
export const lajollaPalette: string[] = [
  '#FFFFCC',
  '#FEFBBF',
  '#FEF7B2',
  '#FEF0A1',
  '#FDE790',
  '#FCDB7F',
  '#FBCE6E',
  '#F9BF5E',
  '#F6AD51',
  '#F39A45',
  '#EF873B',
  '#EA7433',
  '#E3602C',
  '#D94D27',
  '#CC3D25',
  '#BC3026',
  '#A82728',
  '#92212A',
  '#7C1D2B',
  '#66182B',
  '#521429',
  '#3F1026',
  '#2D0D21',
  '#1D091A',
  '#0D0511',
]

export const palettes: Record<string, string[]> = {
  vik: vikPalette,
  lajolla: lajollaPalette,
}

/**
 * Get the palette colors for a given palette name.
 */
export function getPalette(name: string): string[] {
  return palettes[name] || vikPalette
}
