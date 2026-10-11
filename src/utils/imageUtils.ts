/**
 * Utility to convert an image URL (PNG, SVG, JPG) into a PNG data URL
 * so it can be reliably used in canvas, jsPDF, or local caching.
 */
export function loadImageAsDataUrl(url: string, width = 300, height = 300): Promise<string> {
  return new Promise((resolve) => {
    if (!url) {
      resolve('');
      return;
    }

    if (url.startsWith('data:image/png')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || width;
        canvas.height = img.naturalHeight || height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (err) {
        console.warn('Canvas conversion fallback for image:', err);
      }
      resolve(url);
    };
    img.onerror = () => {
      resolve(url);
    };
    img.src = url;
  });
}
