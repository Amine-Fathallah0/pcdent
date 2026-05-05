import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthenticatedFileUrl } from '../hooks/useAuthenticatedFileUrl';

interface AuthenticatedScanOverlayProps {
  baseSrc: string | null | undefined;
  maskSrc: string | null | undefined;
  alt: string;
  labelMap?: Record<string, string> | null;
  className?: string;
  style?: React.CSSProperties;
}

const placeholderStyle = (style?: React.CSSProperties): React.CSSProperties => ({
  width: '100%',
  aspectRatio: '1',
  background: '#0F172A',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94A3B8',
  fontSize: 'var(--font-size-sm)',
  textAlign: 'center',
  padding: 'var(--space-12)',
  ...style,
});

const paletteColor = (instanceId: number): [number, number, number] => [
  (instanceId * 59) % 255,
  (instanceId * 97) % 255,
  (instanceId * 149) % 255,
];

export const AuthenticatedScanOverlay = ({
  baseSrc,
  maskSrc,
  alt,
  labelMap,
  className,
  style,
}: AuthenticatedScanOverlayProps) => {
  const { objectUrl: baseUrl, loading: baseLoading, error: baseError } = useAuthenticatedFileUrl(baseSrc);
  const { objectUrl: maskUrl, loading: maskLoading } = useAuthenticatedFileUrl(maskSrc);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskDataRef = useRef<ImageData | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const overlayDataRef = useRef<ImageData | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  const hoverLabel = useMemo(() => {
    if (!hoverId || !labelMap) return null;
    return labelMap[String(hoverId)] || `Detection #${hoverId}`;
  }, [hoverId, labelMap]);

  // Maps each instance ID → 1-based index of its class among unique classes.
  // All instances of the same class share one color index.
  const instanceColorId = useMemo(() => {
    if (!labelMap) return {} as Record<number, number>;
    const uniqueClasses = [...new Set(Object.values(labelMap))];
    return Object.fromEntries(
      Object.entries(labelMap).map(([id, cls]) => [Number(id), uniqueClasses.indexOf(cls) + 1])
    );
  }, [labelMap]);

  const putImageDataComposited = useCallback(
    (ctx: CanvasRenderingContext2D, data: ImageData) => {
      const tmp = document.createElement('canvas');
      tmp.width = data.width;
      tmp.height = data.height;
      tmp.getContext('2d')!.putImageData(data, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    },
    []
  );

  const drawFrame = useCallback(
    (highlightId?: number | null) => {
      const canvas = canvasRef.current;
      const baseImage = baseImageRef.current;
      if (!canvas || !baseImage) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      if (!showOverlay) return;

      const overlayData = overlayDataRef.current;
      if (overlayData) {
        putImageDataComposited(ctx, overlayData);
      }

      if (highlightId && maskDataRef.current) {
        const maskData = maskDataRef.current;
        const highlight = new ImageData(maskData.width, maskData.height);
        const colorId = instanceColorId[highlightId] ?? highlightId;
        const [r, g, b] = paletteColor(colorId);
        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] === highlightId) {
            highlight.data[i] = r;
            highlight.data[i + 1] = g;
            highlight.data[i + 2] = b;
            highlight.data[i + 3] = 200;
          }
        }
        putImageDataComposited(ctx, highlight);
      }
    },
    [showOverlay, putImageDataComposited, instanceColorId]
  );

  useEffect(() => {
    if (!baseUrl) return;

    const baseImage = new Image();
    baseImage.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = baseImage.naturalWidth;
      canvas.height = baseImage.naturalHeight;
      baseImageRef.current = baseImage;

      if (!maskUrl) {
        maskDataRef.current = null;
        overlayDataRef.current = null;
        drawFrame(null);
        return;
      }

      const maskImage = new Image();
      maskImage.onload = () => {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = baseImage.naturalWidth;
        maskCanvas.height = baseImage.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;
        maskCtx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        maskDataRef.current = maskData;

        const overlay = new ImageData(maskCanvas.width, maskCanvas.height);
        for (let i = 0; i < maskData.data.length; i += 4) {
          const instanceId = maskData.data[i];
          if (instanceId === 0) continue;
          const colorId = instanceColorId[instanceId] ?? instanceId;
          const [r, g, b] = paletteColor(colorId);
          overlay.data[i] = r;
          overlay.data[i + 1] = g;
          overlay.data[i + 2] = b;
          overlay.data[i + 3] = 120;
        }
        overlayDataRef.current = overlay;
        drawFrame(null);
      };
      maskImage.src = maskUrl;
    };
    baseImage.src = baseUrl;
  }, [baseUrl, maskUrl, drawFrame, instanceColorId]);

  useEffect(() => {
    drawFrame(hoverId);
  }, [hoverId, drawFrame]);

  const handlePointerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskDataRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const index = (y * canvas.width + x) * 4;
    const instanceId = maskDataRef.current.data[index];

    if (instanceId === 0) {
      if (hoverId !== null) setHoverId(null);
      setHoverPos(null);
      return;
    }

    if (instanceId !== hoverId) {
      setHoverId(instanceId);
    }
    setHoverPos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const handlePointerLeave = () => {
    setHoverId(null);
    setHoverPos(null);
  };

  if (!baseSrc) {
    return null;
  }

  if (baseLoading || maskLoading) {
    return <div style={placeholderStyle(style)}>Loading scan…</div>;
  }

  if (baseError || !baseUrl) {
    return <div style={placeholderStyle(style)}>Unable to load scan.</div>;
  }

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <canvas
        ref={canvasRef}
        aria-label={alt}
        role="img"
        style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-md)', background: '#000' }}
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
      />
      {maskUrl && (
        <button
          type="button"
          onClick={() => setShowOverlay((prev) => !prev)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#e2e8f0',
            border: '1px solid rgba(20, 184, 166, 0.45)',
            borderRadius: '999px',
            padding: '5px 12px',
            fontSize: 'var(--font-size-xs)',
            cursor: 'pointer',
            transition: 'border-color 150ms, background 150ms',
          }}
        >
          {showOverlay ? 'Hide overlay' : 'Show overlay'}
        </button>
      )}
      {hoverLabel && hoverPos && (
        <div
          style={{
            position: 'absolute',
            left: hoverPos.x + 12,
            top: hoverPos.y + 12,
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#F8FAFC',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: 'var(--font-size-xs)',
            pointerEvents: 'none',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          }}
        >
          {hoverLabel}
        </div>
      )}
    </div>
  );
};

export default AuthenticatedScanOverlay;
