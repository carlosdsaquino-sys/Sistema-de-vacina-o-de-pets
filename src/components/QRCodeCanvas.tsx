import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
}

export function QRCodeCanvas({ value, size = 160 }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: { dark: '#065f46', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}
