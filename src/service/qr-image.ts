import { encodePngRgba, fillPixel } from "openclaw/plugin-sdk/media-runtime";
import QRCodeModule from "qrcode-terminal/vendor/QRCode/index.js";
import QRErrorCorrectLevelModule from "qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js";

type QRCodeConstructor = new (
  typeNumber: number,
  errorCorrectLevel: unknown,
) => {
  addData: (data: string) => void;
  make: () => void;
  getModuleCount: () => number;
  isDark: (row: number, col: number) => boolean;
};

const QRCode = QRCodeModule as QRCodeConstructor;
const QRErrorCorrectLevel = QRErrorCorrectLevelModule;

export function renderQrImageDataUrl(
  input: string,
  opts: { scale?: number; marginModules?: number } = {},
): string {
  const { scale = 6, marginModules = 4 } = opts;
  const qr = new QRCode(-1, QRErrorCorrectLevel.L);
  qr.addData(input);
  qr.make();

  const modules = qr.getModuleCount();
  const size = (modules + marginModules * 2) * scale;
  const buf = Buffer.alloc(size * size * 4, 255);

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (!qr.isDark(row, col)) {
        continue;
      }
      const startX = (col + marginModules) * scale;
      const startY = (row + marginModules) * scale;
      for (let y = 0; y < scale; y += 1) {
        for (let x = 0; x < scale; x += 1) {
          fillPixel(buf, startX + x, startY + y, size, 0, 0, 0, 255);
        }
      }
    }
  }

  const png = encodePngRgba(buf, size, size);
  return `data:image/png;base64,${png.toString("base64")}`;
}
