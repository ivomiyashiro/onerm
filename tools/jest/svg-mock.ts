// Jest has no SVG transformer: an imported SVG becomes a host element that keeps its props, so
// tests can check the size and color the Icon component passes.
import { createElement } from 'react';

export default function SvgMock(props: Record<string, unknown>) {
  return createElement('Svg', props);
}
