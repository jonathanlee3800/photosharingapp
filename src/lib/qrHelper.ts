import QRCode from 'qrcode';

/**
 * Generates a base64 Data URL for a given text / URL
 */
export async function generateQrDataUrl(
  text: string,
  options: { width?: number; margin?: number; color?: { dark: string; light: string } } = {}
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: options.width || 400,
      margin: options.margin || 2,
      color: options.color || {
        dark: '#14241B',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Generates an SVG string for a given text / URL
 */
export async function generateQrSvg(
  text: string,
  options: { margin?: number; color?: { dark: string; light: string } } = {}
): Promise<string> {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: options.margin || 1,
      color: options.color || {
        dark: '#14241B',
        light: '#FFFFFF',
      },
    });
    return svg;
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    return '';
  }
}

/**
 * Trigger client download of QR code PNG
 */
export async function downloadQrCode(urlToEncode: string, eventTitle: string) {
  const dataUrl = await generateQrDataUrl(urlToEncode, { width: 800, margin: 2 });
  if (!dataUrl) return;

  const safeTitle = eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `wedding-qr-code-${safeTitle}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

