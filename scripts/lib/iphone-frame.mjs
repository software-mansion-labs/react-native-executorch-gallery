// Frame geometry adapted from the library docs' TaskShowcase/styles.module.css (MIT).
// Keep its screen ratio, elliptical corners, bezel and manufacturer-based button positions.
export function iphoneFrame(screenWidth) {
  const screenHeight = Math.round((screenWidth * 2622) / 1206);
  const scale = screenHeight / 560;
  const inset = Math.round(8 * scale);
  const margin = Math.round(20 * scale);
  const phoneWidth = screenWidth + inset * 2;
  const phoneHeight = screenHeight + inset * 2;
  const width = phoneWidth + margin * 2;
  const height = phoneHeight + margin * 2;
  const screen = {
    left: margin + inset,
    top: margin + inset,
    width: screenWidth,
    height: screenHeight,
    rx: screenWidth * 0.196,
    ry: screenHeight * 0.09,
  };
  const button = (left, top, w, h) =>
    `<rect x="${left}" y="${margin + phoneHeight * top}" width="${w * scale}" height="${phoneHeight * h}" rx="${2 * scale}" fill="#747b83"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><filter id="shadow" x="-50%" y="-20%" width="200%" height="150%"><feGaussianBlur stdDeviation="${8 * scale}"/></filter></defs>
    <rect x="${margin}" y="${margin + 9 * scale}" width="${phoneWidth}" height="${phoneHeight}" rx="${phoneWidth * 0.196}" ry="${phoneHeight * 0.09}" fill="#000" opacity=".24" filter="url(#shadow)"/>
    ${button(margin - 4 * scale, 0.204, 3, 0.051)}
    ${button(margin - 4 * scale, 0.286, 3, 0.073)}
    ${button(margin - 4 * scale, 0.382, 3, 0.073)}
    ${button(margin + phoneWidth + scale, 0.309, 3, 0.119)}
    ${button(margin + phoneWidth, 0.604, 2, 0.101)}
    <rect x="${margin}" y="${margin}" width="${phoneWidth}" height="${phoneHeight}" rx="${phoneWidth * 0.196}" ry="${phoneHeight * 0.09}" fill="#17191c" stroke="#747b83" stroke-width="${2 * scale}"/>
    <rect x="${screen.left}" y="${screen.top}" width="${screen.width}" height="${screen.height}" rx="${screen.rx}" ry="${screen.ry}" fill="#000"/>
  </svg>`;
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="100%" height="100%" rx="${screen.rx}" ry="${screen.ry}" fill="white"/></svg>`;
  return { width, height, screen, svg: Buffer.from(svg), mask: Buffer.from(mask) };
}
