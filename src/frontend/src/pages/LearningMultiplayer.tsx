/* ══════════════════════════════════════════════════════════════
   LearningMultiplayer — /learning/multiplayer
   Phase 3: real multiplayer system with local room simulation
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CognitiveCardData } from "../features/cards/types";
import { CARDS } from "../features/cards/data/cards";
import { useMultiplayerStore } from "../features/cards/multiplayerStore";
import MultiplayerLobby from "../features/cards/components/multiplayer/MultiplayerLobby";
import MultiplayerRoom  from "../features/cards/components/multiplayer/MultiplayerRoom";

export default function LearningMultiplayer() {
  // activeCard drives the multiplayerStore — must be stable across hook calls
  const [activeCard, setActiveCard] = useState<CognitiveCardData>(CARDS[0]);
  const store = useMultiplayerStore(activeCard);

  const inRoom = store.status !== "idle";

  return (
    <div className="px-5 py-5 h-full overflow-y-auto">
      <AnimatePresence mode="wait">

        {!inRoom && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MultiplayerLobby
              store={store}
              activeCard={activeCard}
              onCardChange={setActiveCard}
            />
          </motion.div>
        )}

        {inRoom && (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            <MultiplayerRoom
              card={activeCard}
              store={store}
              onLeave={store.leaveRoom}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
