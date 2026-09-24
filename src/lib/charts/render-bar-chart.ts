import { PNG } from "pngjs";

type RGB = [number, number, number];

const WHITE: RGB = [255, 255, 255];
const GRID: RGB = [200, 200, 200];

function setPixel(png: PNG, x: number, y: number, color: RGB) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= png.width || yi >= png.height) return;
  const idx = (png.width * yi + xi) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = 255;
}

function fillRect(png: PNG, x: number, y: number, w: number, h: number, color: RGB) {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const w0 = Math.max(0, Math.round(w));
  const h0 = Math.max(0, Math.round(h));
  for (let dy = 0; dy < h0; dy++) {
    for (let dx = 0; dx < w0; dx++) {
      setPixel(png, x0 + dx, y0 + dy, color);
    }
  }
}

// No text is drawn on these images deliberately — pure-JS text rendering
// without a native canvas library needs a bitmap font, which is a lot of
// extra code for modest gain. Instead, these charts show the *shape* of the
// data (relative bar heights/lengths), and the exact labels/values live in
// the data table that always accompanies the image in the exported
// document. A colored-square legend (drawn as real text/shapes in the
// surrounding document, not in the image) explains which color is which.
export function renderGroupedBarChartPng(params: {
  seriesA: number[];
  seriesB: number[];
  width?: number;
  height?: number;
  colorA?: RGB;
  colorB?: RGB;
}): Buffer {
  const width = params.width ?? 700;
  const height = params.height ?? 300;
  const colorA = params.colorA ?? ([17, 24, 39] as RGB);
  const colorB = params.colorB ?? ([220, 38, 38] as RGB);
  const png = new PNG({ width, height });
  fillRect(png, 0, 0, width, height, WHITE);

  const n = params.seriesA.length;
  const padding = 20;
  const baselineY = height - padding;

  for (let x = padding; x < width - padding; x++) {
    setPixel(png, x, baselineY, GRID);
  }

  if (n === 0) return PNG.sync.write(png);

  const maxValue = Math.max(1, ...params.seriesA, ...params.seriesB);
  const chartHeight = height - padding * 2;
  const bucketWidth = (width - padding * 2) / n;
  const barWidth = Math.max(2, Math.min(18, bucketWidth / 3));

  for (let i = 0; i < n; i++) {
    const centerX = padding + bucketWidth * i + bucketWidth / 2;
    const aHeight = (params.seriesA[i] / maxValue) * chartHeight;
    const bHeight = (params.seriesB[i] / maxValue) * chartHeight;
    fillRect(png, centerX - barWidth - 1, baselineY - aHeight, barWidth, aHeight, colorA);
    fillRect(png, centerX + 1, baselineY - bHeight, barWidth, bHeight, colorB);
  }

  return PNG.sync.write(png);
}

export function renderSingleSeriesBarChartPng(params: {
  values: number[];
  width?: number;
  height?: number;
  color?: RGB;
}): Buffer {
  const width = params.width ?? 700;
  const n = params.values.length;
  const height = params.height ?? Math.max(120, n * 30);
  const color = params.color ?? ([17, 24, 39] as RGB);
  const png = new PNG({ width, height });
  fillRect(png, 0, 0, width, height, WHITE);

  if (n === 0) return PNG.sync.write(png);

  const maxValue = Math.max(1, ...params.values);
  const padding = 20;
  const rowHeight = (height - padding * 2) / n;
  const barHeight = Math.max(4, Math.min(22, rowHeight * 0.6));
  const maxBarWidth = width - padding * 2;

  for (let i = 0; i < n; i++) {
    const barW = (params.values[i] / maxValue) * maxBarWidth;
    const y = padding + rowHeight * i + (rowHeight - barHeight) / 2;
    fillRect(png, padding, y, Math.max(1, barW), barHeight, color);
  }

  return PNG.sync.write(png);
}
