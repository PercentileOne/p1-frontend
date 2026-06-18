/* ══════════════════════════════════════════════════════════════
   CARDS STORE — module-level singleton
   Starts with seed CARDS; allows runtime additions (e.g. from notes).
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import type { CognitiveCardData } from "./types";
import { CARDS as SEED_CARDS } from "./data/cards";

let _cards: CognitiveCardData[] = [...SEED_CARDS];
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function addCard(card: CognitiveCardData): void {
  _cards = [card, ..._cards];
  _notify();
}

export function getCard(id: string): CognitiveCardData | undefined {
  return _cards.find(c => c.id === id);
}

export function useCardsStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const l = () => rerender(n => n + 1);
    _listeners.add(l);
    return () => { _listeners.delete(l); };
  }, []);
  return { cards: _cards, addCard, getCard };
}
