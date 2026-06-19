/* ══════════════════════════════════════════════════════════════
   LearningBooks — list ↔ detail slide navigation
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBooksStore } from "../features/books/booksStore";
import type { Book } from "../features/books/booksStore";
import BooksList  from "../features/books/components/BooksList";
import BookDetail from "../features/books/components/BookDetail";
import ImportBookModal from "../features/books/components/ImportBookModal";

type View = "list" | "detail";

export default function LearningBooks() {
  const store       = useBooksStore();
  const [view,      setView]      = useState<View>("list");
  const [selected,  setSelected]  = useState<Book | null>(null);
  const [importing, setImporting] = useState(false);

  const openDetail = (book: Book) => {
    setSelected(book);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setTimeout(() => setSelected(null), 300);
  };

  const handleImportConfirm = (draft: Omit<Book, "id" | "createdAt">) => {
    const newBook = store.addBook(draft);
    setImporting(false);
    openDetail(newBook);
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x:   0  }}
            exit={{   opacity: 0, x: -24  }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <BooksList
              books={store.books}
              onSelect={openDetail}
              onImport={() => setImporting(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 32  }}
            animate={{ opacity: 1, x:  0  }}
            exit={{   opacity: 0, x: 32  }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {selected && (
              <BookDetail
                book={selected}
                store={store}
                onBack={goBack}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {importing && (
        <ImportBookModal
          onConfirm={handleImportConfirm}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}
