import { useEffect, useMemo, useRef } from 'react';
import './FloatingImageBackground.css';

interface FloatingImageBackgroundProps {
  imageUrls: string[];
  className?: string;
  cursorStrength?: number;
  maxRepelDistance?: number;
  densityMultiplier?: number;
}

interface FloatingItem {
  id: number;
  url: string;
  left: number;
  top: number;
  size: number;
  depth: number;
  phase: number;
  speedX: number;
  speedY: number;
  rotationSpeed: number;
}

const FALLBACK_IMAGE = '/vite.svg';

const createDistributedPoints = (count: number): Array<{ left: number; top: number }> => {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellWidth = 84 / cols;
  const cellHeight = 80 / rows;
  const points: Array<{ left: number; top: number }> = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (points.length >= count) {
        break;
      }

      const jitterX = (Math.random() - 0.5) * cellWidth * 0.55;
      const jitterY = (Math.random() - 0.5) * cellHeight * 0.55;
      const left = 8 + (col + 0.5) * cellWidth + jitterX;
      const top = 10 + (row + 0.5) * cellHeight + jitterY;

      // Keep icons distributed farther from center for less clustering behind main cards.
      const centerX = 50;
      const centerY = 50;
      let normX = (left - centerX) / 50;
      let normY = (top - centerY) / 50;
      const distance = Math.hypot(normX, normY);
      const minDistance = 0.28;

      // Bias all points slightly outward so spacing feels wider at higher densities.
      const outwardBias = 0.67;
      const biasScale = 1 + outwardBias * (1 - Math.min(distance, 1));
      normX *= biasScale;
      normY *= biasScale;

      if (distance < minDistance) {
        const safeDistance = Math.max(distance, 0.001);
        const push = minDistance / safeDistance;
        normX *= push;
        normY *= push;
      }

      const remappedLeft = centerX + normX * 50;
      const remappedTop = centerY + normY * 50;

      points.push({
        left: Math.max(2, Math.min(98, remappedLeft)),
        top: Math.max(4, Math.min(96, remappedTop)),
      });
    }
  }

  for (let i = points.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  return points;
};

const createItems = (imageUrls: string[], densityMultiplier: number): FloatingItem[] => {
  const repeats = Math.max(1, Math.floor(densityMultiplier));
  const totalCount = imageUrls.length * repeats;
  const points = createDistributedPoints(totalCount);
  const items: FloatingItem[] = [];
  let pointIndex = 0;

  for (let copy = 0; copy < repeats; copy += 1) {
    for (let index = 0; index < imageUrls.length; index += 1) {
      const url = imageUrls[index];
      const point = points[pointIndex] ?? {
        left: 8 + Math.random() * 84,
        top: 10 + Math.random() * 80,
      };
      pointIndex += 1;

      items.push({
        id: copy * imageUrls.length + index,
        url,
        left: point.left,
        top: point.top,
        size: 34 + Math.random() * 32,
        depth: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speedX: 0.45 + Math.random() * 0.4,
        speedY: 0.35 + Math.random() * 0.45,
        rotationSpeed: (Math.random() - 0.5) * 12,
      });
    }
  }

  return items;
};

const FloatingImageBackground = ({
  imageUrls,
  className,
  cursorStrength = 32,
  maxRepelDistance = 230,
  densityMultiplier = 3,
}: FloatingImageBackgroundProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLImageElement | null)[]>([]);

  const items = useMemo(
    () => createItems(imageUrls, densityMultiplier),
    [densityMultiplier, imageUrls]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) {
      return;
    }

    let animationId = 0;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const pointer = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false,
      strength: 0,
    };

    const updateBounds = () => {
      width = container.clientWidth;
      height = container.clientHeight;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      pointer.active =
        pointer.targetX >= 0 &&
        pointer.targetY >= 0 &&
        pointer.targetX <= rect.width &&
        pointer.targetY <= rect.height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const tick = (time: number) => {
      const t = time * 0.001;

      pointer.x += (pointer.targetX - pointer.x) * 0.1;
      pointer.y += (pointer.targetY - pointer.y) * 0.1;
      const targetStrength = pointer.active ? 1 : 0;
      pointer.strength += (targetStrength - pointer.strength) * 0.09;

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const el = itemRefs.current[i];
        if (!el) {
          continue;
        }

        const baseX = (item.left / 100) * width;
        const baseY = (item.top / 100) * height;
        const driftX = Math.sin(t * item.speedX + item.phase) * 12 * item.depth;
        const driftY = Math.cos(t * item.speedY + item.phase) * 10 * item.depth;

        let repelX = 0;
        let repelY = 0;
        if (pointer.strength > 0.001) {
          const dx = baseX + driftX - pointer.x;
          const dy = baseY + driftY - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const linearInfluence = Math.max(0, 1 - distance / maxRepelDistance);
          const smoothInfluence =
            linearInfluence * linearInfluence * (3 - 2 * linearInfluence);
          const strength = smoothInfluence * cursorStrength * item.depth * pointer.strength;
          repelX = (dx / distance) * strength;
          repelY = (dy / distance) * strength;
        }

        const rotate = Math.sin(t * 0.6 + item.phase) * item.rotationSpeed;
        el.style.transform = `translate3d(${driftX + repelX}px, ${driftY + repelY}px, 0) rotate(${rotate}deg)`;
      }

      animationId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('resize', updateBounds);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    animationId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      window.cancelAnimationFrame(animationId);
    };
  }, [cursorStrength, items, maxRepelDistance]);

  return (
    <div
      ref={containerRef}
      className={`floating-images-bg ${className ?? ''}`}
      aria-hidden="true"
    >
      {items.map((item, index) => (
        <img
          key={item.id}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          src={item.url || FALLBACK_IMAGE}
          alt=""
          className="floating-images-bg__item"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            width: `${item.size}px`,
            height: `${item.size}px`,
          }}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      ))}
    </div>
  );
};

export default FloatingImageBackground;