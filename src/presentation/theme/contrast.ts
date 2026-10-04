interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parse(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: +rgba[4] };
  }
  throw new Error(`Unsupported color: ${color}`);
}

/** Paints a translucent color over an opaque background. */
function over(top: Rgba, below: Rgba): Rgba {
  const mix = (t: number, b: number) => Math.round(t * top.a + b * (1 - top.a));
  return { r: mix(top.r, below.r), g: mix(top.g, below.g), b: mix(top.b, below.b), a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG 2.1 contrast ratio (RNF-17). The layers go from the top down: the foreground, then any
 * translucent backgrounds, and last an opaque one.
 */
export function contrastRatio(foreground: string, ...backgrounds: string[]): number {
  const layers = backgrounds.map(parse);
  const base = layers.pop();
  if (!base || base.a !== 1) {
    throw new Error('The last background must be opaque');
  }
  const background = layers.reduceRight((below, layer) => over(layer, below), base);
  const text = over(parse(foreground), background);
  const [light, dark] = [luminance(text), luminance(background)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
