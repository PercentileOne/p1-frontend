import { useEffect, useRef, useState } from 'react';

// One Spatius interviewer's picture area, built the way Spatius describes in its "avatar background" guide: a fixed 16:9 STAGE holds the background image and the
// (transparent) avatar view, both filling it and sharing one coordinate system; any tile shape is just a window cropped from the middle of that stage
// (aspect-fill, centred). So there is no per-tile zooming at all: the avatar sits at its default position and scale, exactly as in Spatius Studio's preview.
//
// Files (downloaded from Spatius Studio: open the avatar, the Background card under the preview, and its cover image):
//   /images/spatius/<seat>-background.jpg   16:9 "stage without the avatar"
//   /images/spatius/<seat>-cover.jpg         still of the avatar on that background (shown while the seat isn't live)
// A missing file is fine: the background falls back to a plain dark gradient, and the cover to a still captured from the avatar itself.

export type SpatiusSeat = 'hr' | 'technical' | 'michelle';

const SEAT_FILES: Record<SpatiusSeat, string> = { hr: 'amina', technical: 'wayne', michelle: 'michelle' };
const FALLBACK_BG = 'radial-gradient(ellipse at 20% 20%, rgba(120,140,175,0.45) 0, transparent 45%), linear-gradient(180deg, #3b475c 0%, #232b3b 70%, #161c29 100%)';

export function SpatiusSeatStage({ seat, stageRef, visible, live, capturedStill, rounded = true }: {
  seat: SpatiusSeat;
  stageRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;            // this seat is on Spatius and hasn't failed
  live: boolean;               // the avatar is connected (hide the cover so the live face shows)
  capturedStill: string | null; // fallback still taken from the avatar itself when there is no cover image
  rounded?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [noBg, setNoBg] = useState(false);
  const [noCover, setNoCover] = useState(false);

  // The stage is always 16:9 and at least as big as the tile in both directions (aspect-fill), centred in it.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setSize(s => (s.w === box.clientWidth && s.h === box.clientHeight ? s : { w: box.clientWidth, h: box.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const stageW = Math.max(size.w, size.h * 16 / 9);
  const stageH = stageW * 9 / 16;
  const base = `/images/spatius/${SEAT_FILES[seat]}`;

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: rounded ? '16px' : undefined, background: FALLBACK_BG, pointerEvents: 'none', opacity: visible ? 1 : 0 }}>
      <div style={{ position: 'absolute', width: stageW, height: stageH, left: (size.w - stageW) / 2, top: (size.h - stageH) / 2 }}>
        {!noBg && <img src={`${base}-background.jpg`} alt="" onError={() => setNoBg(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {/* While the seat isn't live (between questions, or before it connects) show its own cover, never the old HeyGen-era photo underneath. */}
        {!live && !noCover && <img src={`${base}-cover.jpg`} alt="" onError={() => setNoCover(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!live && noCover && capturedStill && <img src={capturedStill} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />}
        <div ref={stageRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
    </div>
  );
}
