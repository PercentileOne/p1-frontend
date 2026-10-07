import { useEffect, useRef, useState } from 'react';

// One Spatius interviewer's picture area, built the way Spatius describes in its "avatar background" guide: a fixed 16:9 STAGE holds the background image and the
// (transparent) avatar view, both filling it and sharing one coordinate system; any tile shape is just a window cropped from the middle of that stage
// (aspect-fill, centred). So there is no per-tile zooming at all: the avatar sits at its default position and scale, exactly as in Spatius Studio's preview.
//
// Files (downloaded from Spatius Studio: open the avatar, the Background card under the preview, and its cover image):
//   /images/spatius/<avatar-id>-background.<jpg|png|webp>   16:9 "stage without the avatar", named by the avatar's Spatius ID (looked up first)
//   /images/spatius/<seat>-background.<jpg|png|webp>         the same, named by seat (amina / wayne / michelle), used when there is no file for the ID
//   /images/spatius/<avatar-id or seat>-cover.<jpg|png|webp> still of the avatar on that background (shown while the seat isn't live)
// A missing file is fine: the background falls back to a plain dark gradient, and with no cover the room shows just the background between questions.

export type SpatiusSeat = 'hr' | 'technical' | 'michelle';

const SEAT_FILES: Record<SpatiusSeat, string> = { hr: 'amina', technical: 'wayne', michelle: 'michelle' };
const EXTS = ['jpg', 'png', 'webp'];
const FALLBACK_BG = 'radial-gradient(ellipse at 20% 20%, rgba(120,140,175,0.45) 0, transparent 45%), linear-gradient(180deg, #3b475c 0%, #232b3b 70%, #161c29 100%)';

export function SpatiusSeatStage({ seat, avatarId, stageRef, visible, live, rendered, rounded = true }: {
  seat: SpatiusSeat;
  avatarId?: string | null;    // the Spatius avatar currently in this seat; its own background file is looked up first
  stageRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;            // this seat is on Spatius and hasn't failed
  live: boolean;               // the avatar is connected (hide the cover so the live face shows)
  rendered: boolean;           // the face has drawn its first frame: the first time this is true, the background comes in together with the face
  rounded?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Candidate file names, in order: by avatar ID first, then by seat. Index into this list of the one being tried; running off the end means "no such file", and the
  // fallbacks apply. (A new avatar ID starts the search again.)
  const bases = [...(avatarId && /^[0-9a-f-]{8,64}$/i.test(avatarId) ? [`/images/spatius/${avatarId}`] : []), `/images/spatius/${SEAT_FILES[seat]}`];
  const bgFiles = bases.flatMap(b => EXTS.map(e => `${b}-background.${e}`));
  const coverFiles = bases.flatMap(b => EXTS.map(e => `${b}-cover.${e}`));
  const [bgTry, setBgTry] = useState(0);
  const [coverTry, setCoverTry] = useState(0);
  useEffect(() => { setBgTry(0); setCoverTry(0); }, [avatarId]);
  const noBg = bgTry >= bgFiles.length;
  const noCover = coverTry >= coverFiles.length;
  // Until the face has drawn for the first time the room stays plain, so an empty background never appears a moment before the person (Spatius's guide: switch the
  // avatar and background together). After that the background stays, with the seat's still over it whenever the seat isn't live.
  const [everRendered, setEverRendered] = useState(false);
  useEffect(() => { if (rendered) setEverRendered(true); }, [rendered]);

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

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: rounded ? '16px' : undefined, background: FALLBACK_BG, pointerEvents: 'none', opacity: visible ? 1 : 0 }}>
      <div style={{ position: 'absolute', width: stageW, height: stageH, left: (size.w - stageW) / 2, top: (size.h - stageH) / 2 }}>
        {!noBg && <img key={bgTry} src={bgFiles[bgTry]} alt="" onError={() => setBgTry(n => n + 1)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: everRendered ? 1 : 0, transition: 'opacity 0.25s ease' }} />}
        {/* While the seat isn't live (between questions, or before it connects) show its own cover, never the old HeyGen-era photo underneath. */}
        {!live && !noCover && everRendered && <img key={coverTry} src={coverFiles[coverTry]} alt="" onError={() => setCoverTry(n => n + 1)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {/* A still captured from the live face (capturedStill) is deliberately NOT shown: exported frames came out stretched and at a different zoom (2026-10-06). Until the seat's cover image is added, the room shows just the background between questions. */}
        <div ref={stageRef} style={{ position: 'absolute', inset: 0 }} />
      </div>
    </div>
  );
}
