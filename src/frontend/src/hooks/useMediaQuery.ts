import { useEffect, useState } from 'react';

// True while a CSS media query matches, and updates as the window changes. Used where the layout itself changes (the Feed's three columns), which inline styles cannot do.
function matches(query: string): boolean {
  try { return window.matchMedia(query).matches; } catch { return false; }
}

export function useMediaQuery(query: string): boolean {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia(query); } catch { return; }
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [query]);
  return on;
}
