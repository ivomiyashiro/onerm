// The Figma icons are drawn in text/primary: replacing it with currentColor lets the Icon
// component pick the color, as the Figma instances do («Cambiá el color del trazo»).
module.exports = {
  replaceAttrValues: { '#F4F4EF': 'currentColor' },
};
