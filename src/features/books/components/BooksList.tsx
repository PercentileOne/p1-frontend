/* ══════════════════════════════════════════════════════════════
   BooksList — grid of book tiles + Import CTA
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Plus, BookOpen, FileDown, Layers, LayoutGrid, ChevronRight } from "lucide-react";
import type { Book } from "../booksStore";
import SectionLabel from "../../cards/components/shared/SectionLabel";

function progressStats(book: Book) {
  const total     = book.chapters.length;
  const withText  = book.chapters.filter(c => c.rawText).length;
  const withCards = book.chapters.filter(c => c.aiCardId).length;
  return { total, withText, withCards, pct: Math.round((withCards / total) * 100) };
}

const SOURCE_ICON: Record<Book["sourceType"], React.ReactNode> = {
  pdf:    <FileDown  size={10} className="text-amber-400"  />,
  epub:   <BookOpen  size={10} className="text-sky-400"    />,
  import: <Layers    size={10} className="text-indigo-400" />,
};

interface Props {
  books:        Book[];
  onSelect:     (book: Book) => void;
  onImport:     () => void;
}

export default function BooksList({ books, onSelect, onImport }: Props) {
  const totalCards    = books.reduce((s, b) => s + b.chapters.filter(c => c.aiCardId).length, 0);
  const totalChapters = books.reduce((s, b) => s + b.chapters.length, 0);

  return (
    <div className="flex flex-col gap-5 px-1 py-2">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white/90">Books</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Import books — generate cards from every chapter</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
        >
          <Plus size={11} />
          Import Book
        </motion.button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <BookOpen    size={12} className="text-indigo-400" />, label: "Books",    value: String(books.length) },
          { icon: <Layers      size={12} className="text-sky-400"    />, label: "Chapters", value: String(totalChapters) },
          { icon: <LayoutGrid  size={12} className="text-amber-400"  />, label: "Cards",    value: String(totalCards)   },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            {s.icon}
            <span className="text-[15px] font-black text-white/85">{s.value}</span>
            <SectionLabel>{s.label}</SectionLabel>
          </div>
        ))}
      </div>

      {/* Book tiles */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <BookOpen size={18} className="text-white/20" />
          </div>
          <p className="text-[12px] text-white/35">No books imported yet</p>
          <button onClick={onImport} className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
            Import your first book →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {books.map((book, i) => {
            const { total, withText, withCards, pct } = progressStats(book);
            return (
              <motion.button
                key={book.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(book)}
                className="w-full text-left flex gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0f1117]"
                style={{ boxShadow: "0 10px 36px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset" }}
              >
                {/* Cover */}
                <div
                  className="w-14 h-20 rounded-xl shrink-0 flex items-end pb-1.5 justify-center overflow-hidden"
                  style={{ background: book.cover ?? "linear-gradient(135deg,#1e293b,#0f172a)" }}
                >
                  <span className="text-[7px] text-white/20 font-bold uppercase tracking-widest px-1 text-center leading-tight">
                    {book.title.split(" ").slice(0, 2).join("\n")}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start gap-2 mb-0.5">
                      <h3 className="text-[13px] font-bold text-white/88 leading-snug flex-1">{book.title}</h3>
                      <span className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                        book.sourceType === "pdf"  ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                        book.sourceType === "epub" ? "text-sky-400   bg-sky-500/10   border-sky-500/20"   :
                                                     "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                      }`}>
                        {SOURCE_ICON[book.sourceType]}
                        {book.sourceType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40">{book.author}</p>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    {/* Progress bar */}
                    <div className="flex items-center justify-between">
                      <SectionLabel>{total} chapters · {withText} extracted · {withCards} carded</SectionLabel>
                      <span className="text-[9px] text-white/25">{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <ChevronRight size={13} className="text-white/15 self-center shrink-0" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
