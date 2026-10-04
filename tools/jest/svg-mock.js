// Jest has no SVG transformer: an imported SVG becomes a host element that keeps its props, so
// tests can check the size and color the Icon component passes.
const { createElement } = require('react');

module.exports = function SvgMock(props) {
  return createElement('Svg', props);
};
