import { TeacherFaceProfile, SmileSensitivity } from '../types';

export interface SmileDetectionResult {
  hasFace: boolean;
  faceBox?: { x: number; y: number; width: number; height: number };
  mouthBox?: { x: number; y: number; width: number; height: number };
  smileScore: number; // 0 - 100
  isSmiling: boolean;
  threshold: number;
  facePosition: 'GOOD' | 'TOO_FAR' | 'TOO_CLOSE' | 'NO_FACE' | 'OFF_CENTER';
  feedbackText: string;
  mouthAspectRatio: number;
  teethBrightness: number;
}

// Off-screen canvas cache for high performance
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenContext(width = 240, height = 180): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }
  return offscreenCtx ? { canvas: offscreenCanvas, ctx: offscreenCtx } : null;
}

/**
 * Checks if a pixel falls within human skin tone range in YCbCr color space.
 * Human skin across all ethnicities clusters reliably in:
 * Cb in [77..127] and Cr in [133..173].
 */
function isSkinPixel(r: number, g: number, b: number): boolean {
  // YCbCr transformation
  const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
  const cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/**
 * Analyzes video frame in real-time to detect face presence, oval alignment, and smile level.
 */
export function detectSmileInVideo(
  video: HTMLVideoElement,
  options?: {
    personalProfile?: TeacherFaceProfile | null;
    sensitivity?: SmileSensitivity;
  }
): SmileDetectionResult {
  const sensitivity = options?.sensitivity || 'MEDIUM';
  const profile = options?.personalProfile;

  // Threshold based on sensitivity
  let threshold = 65;
  if (sensitivity === 'HIGH') threshold = 50;
  if (sensitivity === 'LOW') threshold = 78;

  const targetWidth = 240;
  const targetHeight = 180;
  const offscreen = getOffscreenContext(targetWidth, targetHeight);

  if (!offscreen || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    return {
      hasFace: false,
      smileScore: 0,
      isSmiling: false,
      threshold,
      facePosition: 'NO_FACE',
      feedbackText: 'Menunggu kamera aktif...',
      mouthAspectRatio: 0,
      teethBrightness: 0,
    };
  }

  const { ctx, canvas } = offscreen;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let frameData: ImageData;
  try {
    frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return {
      hasFace: false,
      smileScore: 0,
      isSmiling: false,
      threshold,
      facePosition: 'NO_FACE',
      feedbackText: 'Memuat feed kamera...',
      mouthAspectRatio: 0,
      teethBrightness: 0,
    };
  }

  const { data, width, height } = frameData;

  // 1. Locate Face Bounding Box using Skin-Tone Cluster
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let skinCount = 0;

  // Step sampling for speed
  const step = 4;
  for (let y = 10; y < height - 10; y += step) {
    for (let x = 10; x < width - 10; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (isSkinPixel(r, g, b)) {
        skinCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const totalSamples = ((width - 20) / step) * ((height - 20) / step);
  const skinRatio = skinCount / Math.max(totalSamples, 1);

  // If too few skin pixels, face is not clearly in frame
  if (skinRatio < 0.08 || maxX - minX < 40 || maxY - minY < 50) {
    return {
      hasFace: false,
      smileScore: 0,
      isSmiling: false,
      threshold,
      facePosition: 'NO_FACE',
      feedbackText: 'Posisikan wajah Anda di dalam bingkai oval',
      mouthAspectRatio: 0,
      teethBrightness: 0,
    };
  }

  const faceW = maxX - minX;
  const faceH = maxY - minY;
  const faceCenterX = minX + faceW / 2;
  const faceCenterY = minY + faceH / 2;

  // Check face positioning relative to frame center
  let facePosition: 'GOOD' | 'TOO_FAR' | 'TOO_CLOSE' | 'NO_FACE' | 'OFF_CENTER' = 'GOOD';
  let feedbackText = 'Wajah terdeteksi! Silakan tersenyum manis 😊';

  const centerDeltaX = Math.abs(faceCenterX - width / 2) / width;
  const centerDeltaY = Math.abs(faceCenterY - height / 2) / height;

  if (faceW < width * 0.28 || faceH < height * 0.35) {
    facePosition = 'TOO_FAR';
    feedbackText = 'Dekatkan sedikit wajah Anda ke kamera';
  } else if (faceW > width * 0.88 || faceH > height * 0.9) {
    facePosition = 'TOO_CLOSE';
    feedbackText = 'Mundurkan sedikit wajah Anda';
  } else if (centerDeltaX > 0.22 || centerDeltaY > 0.22) {
    facePosition = 'OFF_CENTER';
    feedbackText = 'Pusatkan wajah Anda di tengah bingkai';
  }

  // 2. Locate Mouth ROI (Region of Interest)
  // Anatomically: lower 28% to 10% of face height, middle 60% of face width
  const mouthTop = Math.floor(minY + faceH * 0.65);
  const mouthBottom = Math.floor(minY + faceH * 0.92);
  const mouthLeft = Math.floor(minX + faceW * 0.22);
  const mouthRight = Math.floor(minX + faceW * 0.78);

  let mouthMinX = mouthRight;
  let mouthMaxX = mouthLeft;
  let mouthMinY = mouthBottom;
  let mouthMaxY = mouthTop;

  let totalTeethLuminance = 0;
  let teethPixelCount = 0;
  let mouthPixelCount = 0;

  for (let my = mouthTop; my <= mouthBottom; my += 2) {
    for (let mx = mouthLeft; mx <= mouthRight; mx += 2) {
      if (mx < 0 || mx >= width || my < 0 || my >= height) continue;
      const idx = (my * width + mx) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isReddishLip = r > g * 1.15 && r > b * 1.1 && !isSkinPixel(r, g, b);
      const isTeethBright = lum > 160 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;

      if (isReddishLip || isTeethBright) {
        mouthPixelCount++;
        if (mx < mouthMinX) mouthMinX = mx;
        if (mx > mouthMaxX) mouthMaxX = mx;
        if (my < mouthMinY) mouthMinY = my;
        if (my > mouthMaxY) mouthMaxY = my;
      }

      if (isTeethBright) {
        totalTeethLuminance += lum;
        teethPixelCount++;
      }
    }
  }

  let mouthW = mouthMaxX - mouthMinX;
  let mouthH = mouthMaxY - mouthMinY;

  // Fallback defaults if mouth bounds are tight
  if (mouthW <= 5 || mouthH <= 2) {
    mouthW = faceW * 0.4;
    mouthH = faceH * 0.15;
  }

  const mouthAspectRatio = mouthW / Math.max(mouthH, 1);
  const mouthToFaceWidthRatio = mouthW / Math.max(faceW, 1);
  const avgTeethLuminance = teethPixelCount > 0 ? totalTeethLuminance / teethPixelCount : 0;
  const teethRatio = teethPixelCount / Math.max(mouthPixelCount, 1);

  // 3. Compute Smile Score (0 - 100%)
  let computedSmileScore = 0;

  if (profile && profile.neutralMouthRatio && profile.smileMouthRatio && profile.smileMouthRatio > profile.neutralMouthRatio) {
    // Personalized Smile Calibration based on teacher's enrolled baseline
    const personalDelta = profile.smileMouthRatio - profile.neutralMouthRatio;
    const currentDelta = mouthAspectRatio - profile.neutralMouthRatio;
    const ratioFactor = Math.max(0, Math.min(1.2, currentDelta / personalDelta));

    let score = ratioFactor * 75;
    if (teethRatio > 0.08 || avgTeethLuminance > 165) {
      score += 25;
    } else if (teethRatio > 0.03) {
      score += 15;
    }
    computedSmileScore = Math.round(Math.min(100, Math.max(0, score)));
  } else {
    // Universal Face Proportions
    // Normal neutral mouth ratio ~1.8 - 2.2. Smiling expands to ~2.8 - 4.0+.
    // Mouth width relative to face width expands from ~0.35 (neutral) to ~0.50+ (smiling).
    let score = 0;

    // A. Mouth width expansion score
    if (mouthToFaceWidthRatio >= 0.48) {
      score += 45;
    } else if (mouthToFaceWidthRatio >= 0.42) {
      score += 35;
    } else if (mouthToFaceWidthRatio >= 0.38) {
      score += 20;
    } else {
      score += 10;
    }

    // B. Mouth aspect ratio score
    if (mouthAspectRatio >= 3.2) {
      score += 35;
    } else if (mouthAspectRatio >= 2.6) {
      score += 25;
    } else if (mouthAspectRatio >= 2.1) {
      score += 15;
    } else {
      score += 5;
    }

    // C. Teeth / smile curvature score
    if (teethRatio >= 0.1 || (teethPixelCount >= 8 && avgTeethLuminance >= 170)) {
      score += 25;
    } else if (teethRatio >= 0.04 || teethPixelCount >= 4) {
      score += 15;
    }

    computedSmileScore = Math.min(100, Math.max(0, Math.round(score)));
  }

  const isSmiling = facePosition === 'GOOD' && computedSmileScore >= threshold;

  if (isSmiling) {
    feedbackText = 'Senyum terdeteksi! Tahan posisi... 📸';
  } else if (facePosition === 'GOOD') {
    if (computedSmileScore >= threshold - 15) {
      feedbackText = 'Hampir! Senyum sedikit lebih lebar lagi... 😊';
    } else {
      feedbackText = 'Wajah siap. Ayo tersenyum ramah untuk foto otomatis! 😊';
    }
  }

  return {
    hasFace: true,
    faceBox: { x: minX, y: minY, width: faceW, height: faceH },
    mouthBox: { x: mouthMinX, y: mouthMinY, width: mouthW, height: mouthH },
    smileScore: computedSmileScore,
    isSmiling,
    threshold,
    facePosition,
    feedbackText,
    mouthAspectRatio,
    teethBrightness: Math.round(avgTeethLuminance),
  };
}

/**
 * Extracts facial metrics from a captured video/canvas snapshot for enrollment.
 */
export function extractEnrollmentMetrics(
  canvas: HTMLCanvasElement
): {
  thumbnailDataUrl: string;
  mouthAspectRatio: number;
  averageBrightness: number;
  skinColor: { r: number; g: number; b: number };
} {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let skinCount = 0;

  let mouthAspect = 2.2;
  let avgBright = 140;

  if (ctx) {
    try {
      const img = ctx.getImageData(0, 0, w, h);
      const { data } = img;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isSkinPixel(r, g, b)) {
          totalR += r;
          totalG += g;
          totalB += b;
          skinCount++;
        }
      }
    } catch (e) {
      console.warn('extractEnrollmentMetrics getImageData failed:', e);
    }
  }

  const avgR = skinCount > 0 ? Math.round(totalR / skinCount) : 180;
  const avgG = skinCount > 0 ? Math.round(totalG / skinCount) : 140;
  const avgB = skinCount > 0 ? Math.round(totalB / skinCount) : 120;
  avgBright = Math.round(0.299 * avgR + 0.587 * avgG + 0.114 * avgB);

  // Resize down to compact 200px thumbnail
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 180;
  thumbCanvas.height = 180;
  const tCtx = thumbCanvas.getContext('2d');
  if (tCtx) {
    tCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }

  return {
    thumbnailDataUrl: thumbCanvas.toDataURL('image/jpeg', 0.8),
    mouthAspectRatio: mouthAspect,
    averageBrightness: avgBright,
    skinColor: { r: avgR, g: avgG, b: avgB },
  };
}

/**
 * Plays a pleasant synthetic camera shutter click audio cue using Web Audio API.
 * Requires no external audio file and works seamlessly offline.
 */
export function playShutterSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // 1st click
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.04);

    // 2nd click (shutter release)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(600, ctx.currentTime + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.11);
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.06);
    osc2.stop(ctx.currentTime + 0.11);
  } catch (err) {
    console.debug('playShutterSound ignored:', err);
  }
}
