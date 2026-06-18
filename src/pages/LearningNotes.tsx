/* ══════════════════════════════════════════════════════════════
   LearningNotes — /learning/notes
   Phase 5: Study Notes Centre
   List → Detail (inline), with New Note and Scan/Upload modals
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotesStore } from "../features/notes/notesStore";
import type { Note } from "../features/notes/notesStore";
import NotesList        from "../features/notes/components/NotesList";
import NoteDetail       from "../features/notes/components/NoteDetail";
import NewNoteModal     from "../features/notes/components/NewNoteModal";
import ScanUploadModal  from "../features/notes/components/ScanUploadModal";

export default function LearningNotes() {
  const store                         = useNotesStore();
  const [selected,    setSelected]    = useState<Note | null>(null);
  const [showNew,     setShowNew]     = useState(false);
  const [showScan,    setShowScan]    = useState(false);

  const handleNewNote = (noteData: Parameters<typeof store.addNote>[0]) => {
    const note = store.addNote(noteData);
    setShowNew(false);
    setSelected(note);
  };

  const handleScanSave = (noteData: Parameters<typeof store.addNote>[0]) => {
    const note = store.addNote(noteData);
    setShowScan(false);
    setSelected(note);
  };

  const handleViewCard = (cardId: string) => {
    // Navigate to /learning/cards with the card open — for now just close detail
    // Full card-open deep-linking is a future enhancement
    console.info("Navigate to card:", cardId);
  };

  return (
    <div className="px-5 py-5 h-full overflow-y-auto">
      <AnimatePresence mode="wait">

        {!selected ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <NotesList
              notes={store.notes}
              onSelect={setSelected}
              onNewNote={() => setShowNew(true)}
              onScanUpload={() => setShowScan(true)}
              onDelete={store.deleteNote}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`detail-${selected.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0  }}
            exit={{   opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            className="h-full"
          >
            <NoteDetail
              note={selected}
              store={store}
              onBack={() => setSelected(null)}
              onViewCard={handleViewCard}
            />
          </motion.div>
        )}

      </AnimatePresence>

      {showNew && (
        <NewNoteModal
          onConfirm={handleNewNote}
          onClose={() => setShowNew(false)}
        />
      )}

      {showScan && (
        <ScanUploadModal
          onConfirm={handleScanSave}
          onClose={() => setShowScan(false)}
        />
      )}
    </div>
  );
}
