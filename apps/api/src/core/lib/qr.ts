import QRCode from "qrcode";

/** Ảnh mã QR (data URL PNG) cho một đường link */
export function makeQrDataUrl(text: string, width = 480): Promise<string> {
  return QRCode.toDataURL(text, { margin: 2, width, errorCorrectionLevel: "L" });
}
