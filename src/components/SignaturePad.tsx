import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onSaveLabel?: string;
}

export function SignaturePad({ onSave, onSaveLabel = 'Confirmar Assinatura' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const context = canvas.getContext('2d');
    if (context) {
      context.scale(dpr, dpr);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#1f2937';
      context.lineWidth = 2.5;
      setCtx(context);
    }
  }, []);

  const getPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || !ctx) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-colors',
          hasSignature ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-300 bg-gray-50/50'
        )}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-44 touch-none cursor-crosshair rounded-xl"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerLeave={stopDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400">Assine aqui com o mouse ou toque</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} disabled={!hasSignature}>
          <Eraser className="w-4 h-4" />
          Limpar
        </Button>
        <Button variant="success" size="sm" onClick={save} disabled={!hasSignature} className="flex-1">
          <Check className="w-4 h-4" />
          {onSaveLabel}
        </Button>
      </div>
    </div>
  );
}
