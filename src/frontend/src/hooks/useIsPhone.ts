import { useEffect, useState } from 'react';

// True while the window is phone-narrow (Francis, 2026-10-11: the portal was built for a laptop, and on a phone its 220 px sidebar left about 150 px for the page).
// Width, not touch, decides: a narrow desktop window gets the same single-column layout, and a tablet in landscape keeps the full one.
const QUERY = '(max-width: 700px)';

function now(): boolean {
  try { return window.matchMedia(QUERY).matches; } catch { return false; }
}

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(now);
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia(QUERY); } catch { return; }
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return phone;
}
