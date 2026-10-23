import { useEffect, useRef } from 'react';
import SiteGuide from '../components/SiteGuide';

// The talking guide as the marketing homepage frames it (above "Choose your interviewer"), 2026-10-23. Transparent so the homepage's own panel colour shows through, and it
// reports its height to the page that framed it so the frame always fits and never scrolls. The server door behind it is capped and has an admin switch (Features/SiteAgents).
export default function GuidePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = [document.documentElement.style.background, document.body.style.background];
    document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent';
    const el = rootRef.current;
    const tell = () => { if (el && window.parent !== window) { try { window.parent.postMessage({ type: 'site-guide-height', height: Math.ceil(el.getBoundingClientRect().height) }, '*'); } catch { /* not framed */ } } };
    tell();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(tell) : null;
    if (ro && el) ro.observe(el);
    return () => { ro?.disconnect(); document.documentElement.style.background = prev[0]; document.body.style.background = prev[1]; };
  }, []);
  return <div ref={rootRef} style={{ padding: 2 }}><SiteGuide publicMode /></div>;
}
