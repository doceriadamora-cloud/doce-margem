import {
  DEFAULT_QUOTE_PRIMARY_COLOR,
  DEFAULT_QUOTE_SECONDARY_COLOR,
  MAX_STORED_LOGO_DATA_URL_LENGTH,
} from "@/types/quotes";

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_LOGO_FILE_SIZE_LABEL = "2 MB";

const MAX_LOGO_WIDTH = 720;
const MAX_LOGO_HEIGHT = 360;
const MAX_STORED_LOGO_BYTES = 350 * 1024;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface ColorBucket extends RgbColor {
  count: number;
}

export interface SuggestedQuoteColors {
  primaryColor: string;
  secondaryColor: string;
}

export interface ProcessedQuoteLogo {
  dataUrl: string;
  suggestedColors: SuggestedQuoteColors | null;
}

export interface QuoteColorTheme {
  primary: string;
  primaryText: string;
  onPrimary: string;
  secondary: string;
  secondaryTint: string;
  onSecondaryTint: string;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(value: string): RgbColor {
  const normalized = normalizeHexColor(value) ?? DEFAULT_QUOTE_PRIMARY_COLOR;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function normalizeHexColor(value: string): string | null {
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
}

function relativeLuminance(color: RgbColor): number {
  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(first: RgbColor, second: RgbColor): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixHexColors(first: string, second: string, secondWeight: number): string {
  const start = hexToRgb(first);
  const end = hexToRgb(second);
  const weight = Math.max(0, Math.min(1, secondWeight));
  return rgbToHex({
    r: start.r * (1 - weight) + end.r * weight,
    g: start.g * (1 - weight) + end.g * weight,
    b: start.b * (1 - weight) + end.b * weight,
  });
}

export function getContrastTextColor(background: string): "#ffffff" | "#1c1917" {
  const backgroundRgb = hexToRgb(background);
  const white = hexToRgb("#ffffff");
  const dark = hexToRgb("#1c1917");
  return contrastRatio(backgroundRgb, white) >= contrastRatio(backgroundRgb, dark)
    ? "#ffffff"
    : "#1c1917";
}

function getReadableColorOnWhite(color: string): string {
  let candidate = normalizeHexColor(color) ?? DEFAULT_QUOTE_PRIMARY_COLOR;
  const white = hexToRgb("#ffffff");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (contrastRatio(hexToRgb(candidate), white) >= 4.5) return candidate;
    candidate = mixHexColors(candidate, "#000000", 0.16);
  }
  return "#1c1917";
}

export function createQuoteColorTheme(
  primaryColor: string,
  secondaryColor: string,
): QuoteColorTheme {
  const primary = normalizeHexColor(primaryColor) ?? DEFAULT_QUOTE_PRIMARY_COLOR;
  const secondary = normalizeHexColor(secondaryColor) ?? DEFAULT_QUOTE_SECONDARY_COLOR;
  const secondaryTint = mixHexColors(secondary, "#ffffff", 0.86);

  return {
    primary,
    primaryText: getReadableColorOnWhite(primary),
    onPrimary: getContrastTextColor(primary),
    secondary,
    secondaryTint,
    onSecondaryTint: getContrastTextColor(secondaryTint),
  };
}

function calculateFittedDimensions(
  width: number,
  height: number,
  scaleMultiplier = 1,
): { width: number; height: number } {
  const scale = Math.min(MAX_LOGO_WIDTH / width, MAX_LOGO_HEIGHT / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale * scaleMultiplier)),
    height: Math.max(1, Math.round(height * scale * scaleMultiplier)),
  };
}

function drawImageToCanvas(
  image: HTMLImageElement,
  dimensions: { width: number; height: number },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Seu navegador não conseguiu processar esta imagem.");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível compactar a logo escolhida."));
      },
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Não foi possível salvar a logo escolhida."));
    reader.onerror = () => reject(new Error("Não foi possível salvar a logo escolhida."));
    reader.readAsDataURL(blob);
  });
}

async function loadFileImage(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  const image = new window.Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("O arquivo não contém uma imagem válida."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("O arquivo não contém uma imagem válida.");
  }
  return image;
}

function colorDistance(first: RgbColor, second: RgbColor): number {
  return Math.sqrt(
    (first.r - second.r) ** 2 +
      (first.g - second.g) ** 2 +
      (first.b - second.b) ** 2,
  );
}

function colorSaturation(color: RgbColor): number {
  const maximum = Math.max(color.r, color.g, color.b);
  const minimum = Math.min(color.r, color.g, color.b);
  return maximum === 0 ? 0 : (maximum - minimum) / maximum;
}

function deriveSecondaryColor(primary: RgbColor): string {
  const primaryHex = rgbToHex(primary);
  return relativeLuminance(primary) < 0.58
    ? mixHexColors(primaryHex, "#ffffff", 0.58)
    : mixHexColors(primaryHex, "#000000", 0.34);
}

function suggestColorsFromCanvas(canvas: HTMLCanvasElement): SuggestedQuoteColors | null {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return null;
  }

  const sampleStep = Math.max(1, Math.floor(Math.sqrt((canvas.width * canvas.height) / 16_000)));
  const buckets = new Map<string, ColorBucket>();

  for (let pixel = 0; pixel < pixels.length; pixel += 4 * sampleStep) {
    const r = pixels[pixel] ?? 0;
    const g = pixels[pixel + 1] ?? 0;
    const b = pixels[pixel + 2] ?? 0;
    const alpha = pixels[pixel + 3] ?? 0;

    if (alpha < 128) continue;
    if (r >= 245 && g >= 245 && b >= 245) continue;
    if (r <= 10 && g <= 10 && b <= 10) continue;

    const key = `${Math.floor(r / 32)}-${Math.floor(g / 32)}-${Math.floor(b / 32)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const candidates = [...buckets.values()]
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }))
    .sort(
      (first, second) =>
        second.count * (0.8 + colorSaturation(second)) -
        first.count * (0.8 + colorSaturation(first)),
    );

  const primary = candidates[0];
  if (!primary) return null;

  const secondary = candidates.find((candidate) => colorDistance(primary, candidate) >= 72);
  return {
    primaryColor: rgbToHex(primary),
    secondaryColor: secondary ? rgbToHex(secondary) : deriveSecondaryColor(primary),
  };
}

export async function processQuoteLogo(file: File): Promise<ProcessedQuoteLogo> {
  if (!ALLOWED_LOGO_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    throw new Error("Escolha uma logo em PNG, JPG/JPEG ou WEBP.");
  }
  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new Error(`A logo deve ter no máximo ${MAX_LOGO_FILE_SIZE_LABEL}.`);
  }

  const image = await loadFileImage(file);
  const paletteCanvas = drawImageToCanvas(
    image,
    calculateFittedDimensions(image.naturalWidth, image.naturalHeight),
  );
  const suggestedColors = suggestColorsFromCanvas(paletteCanvas);

  let compressedBlob: Blob | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const dimensions = calculateFittedDimensions(
      image.naturalWidth,
      image.naturalHeight,
      0.82 ** attempt,
    );
    const canvas = drawImageToCanvas(image, dimensions);
    const blob = await canvasToBlob(canvas, Math.max(0.58, 0.88 - attempt * 0.08));
    compressedBlob = blob;
    if (blob.size <= MAX_STORED_LOGO_BYTES) break;
  }

  if (!compressedBlob || compressedBlob.size > MAX_STORED_LOGO_BYTES) {
    throw new Error("A logo continuou muito grande após a compactação. Escolha uma imagem menor.");
  }

  const dataUrl = await blobToDataUrl(compressedBlob);
  if (dataUrl.length > MAX_STORED_LOGO_DATA_URL_LENGTH) {
    throw new Error("A logo continuou muito grande após a compactação. Escolha uma imagem menor.");
  }

  return { dataUrl, suggestedColors };
}
