import { useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

export function ResizablePanel({ width, onResize, side = 'left', children }: { width: number; onResize: (width: number) => void; side?: 'left' | 'right'; children: ReactNode }) {
  const dragging = useRef(false);
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);
  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = side === 'left' ? event.movementX : -event.movementX;
    onResize(width + delta);
  }, [onResize, side, width]);
  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <div className="relative flex shrink-0" style={{ width }}>
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`absolute top-0 h-full w-1 cursor-col-resize bg-line/40 hover:bg-cyan/50 ${side === 'left' ? 'right-0' : 'left-0'}`}
      />
    </div>
  );
}
