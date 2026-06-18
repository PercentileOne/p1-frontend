import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, X, Share2, Download, Sparkles, Copy, Check } from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   P1 WISDOM WALL
   ══════════════════════════════════════════════════════════════ */

interface WisdomQuote {
  quote: string;
  author: string | null;
  label: string;
}

interface TilePalette {
  bg: string;
  border: string;
  labelColor: string;
  quoteColor: string;
  authorColor: string;
  accentColor: string;
  shadow: string;
  quoteMarkColor: string;
  gradientStops: [string, number][];
}

interface SavedQuote extends WisdomQuote {
  id: string;
  tileId: string;
  tilePalette: TilePalette;
  savedAt: Date;
}

interface TileConfig {
  id: string;
  name: string;
  quotes: WisdomQuote[];
  palette: TilePalette;
}

// ── Quote pools ──────────────────────────────────────────────

const STOIC: WisdomQuote[] = [
  { quote: "You have power over your mind — not outside events. Realise this, and you will find strength.", author: "Marcus Aurelius", label: "Stoic Wisdom" },
  { quote: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", label: "Stoic Wisdom" },
  { quote: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius", label: "Stoic Wisdom" },
  { quote: "Luck is what happens when preparation meets opportunity.", author: "Seneca", label: "Stoic Wisdom" },
  { quote: "He is most powerful who has power over himself.", author: "Seneca", label: "Stoic Wisdom" },
  { quote: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus", label: "Stoic Wisdom" },
  { quote: "Do not seek for things to happen the way you want them to; but wish that what happens, happens the way it is. Then you will have a tranquil flow of life.", author: "Epictetus", label: "Stoic Wisdom" },
];

const FOUNDER: WisdomQuote[] = [
  { quote: "Discipline equals freedom.", author: "Jocko Willink", label: "Founder Mindset" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs", label: "Founder Mindset" },
  { quote: "You don't build a business. You build people, and then people build the business.", author: "Zig Ziglar", label: "Founder Mindset" },
  { quote: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky", label: "Founder Mindset" },
  { quote: "Move fast. Learn faster. Break nothing of value.", author: "First Principles", label: "Founder Mindset" },
  { quote: "An entrepreneur is someone who will jump off a cliff and assemble an aeroplane on the way down.", author: "Reid Hoffman", label: "Founder Mindset" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", label: "Founder Mindset" },
];

const P1_ORIGINALS: WisdomQuote[] = [
  { quote: "Your P1 Score is not a judgment. It's a mirror. Use it.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "You trained this morning. Most people didn't. That's already the 1%.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "One focused hour is worth ten distracted ones. You know this.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "The version of you that wins is already inside. P1 is the map.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "Every data point you add is a decision made with more clarity.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "Momentum is a choice you make before 8am.", author: "P1 Intelligence", label: "P1 Original" },
  { quote: "You are not building an app. You are building a mirror for human excellence.", author: "P1 Intelligence", label: "P1 Original" },
];

// ── Tile configs ─────────────────────────────────────────────

const WISDOM_TILES: TileConfig[] = [
  {
    id: "stoic",
    name: "Stoic",
    quotes: STOIC,
    palette: {
      bg: "linear-gradient(135deg, #0f0c29 0%, #1a1744 55%, #24243e 100%)",
      border: "rgba(99,102,241,0.22)",
      labelColor: "#818cf8",
      quoteColor: "rgba(255,255,255,0.92)",
      authorColor: "rgba(148,163,184,0.6)",
      accentColor: "#6366f1",
      shadow: "0 12px 40px rgba(0,0,0,0.65), 0 1px 0 rgba(99,102,241,0.18) inset, 0 -1px 0 rgba(0,0,0,0.45) inset",
      quoteMarkColor: "rgba(99,102,241,0.13)",
      gradientStops: [["#0f0c29", 0], ["#1a1744", 0.55], ["#24243e", 1]],
    },
  },
  {
    id: "founder",
    name: "Founder",
    quotes: FOUNDER,
    palette: {
      bg: "linear-gradient(135deg, #1a0c00 0%, #2a1606 55%, #1c1009 100%)",
      border: "rgba(251,146,60,0.22)",
      labelColor: "#fb923c",
      quoteColor: "rgba(255,255,255,0.92)",
      authorColor: "rgba(203,166,121,0.6)",
      accentColor: "#f97316",
      shadow: "0 12px 40px rgba(0,0,0,0.65), 0 1px 0 rgba(251,146,60,0.14) inset, 0 -1px 0 rgba(0,0,0,0.45) inset",
      quoteMarkColor: "rgba(251,146,60,0.11)",
      gradientStops: [["#1a0c00", 0], ["#2a1606", 0.55], ["#1c1009", 1]],
    },
  },
  {
    id: "p1",
    name: "P1",
    quotes: P1_ORIGINALS,
    palette: {
      bg: "linear-gradient(135deg, #12002e 0%, #1e0a45 55%, #170938 100%)",
      border: "rgba(167,139,250,0.22)",
      labelColor: "#a78bfa",
      quoteColor: "rgba(255,255,255,0.92)",
      authorColor: "rgba(167,139,250,0.5)",
      accentColor: "#8b5cf6",
      shadow: "0 12px 40px rgba(0,0,0,0.65), 0 1px 0 rgba(139,92,246,0.18) inset, 0 -1px 0 rgba(0,0,0,0.45) inset",
      quoteMarkColor: "rgba(139,92,246,0.13)",
      gradientStops: [["#12002e", 0], ["#1e0a45", 0.55], ["#170938", 1]],
    },
  },
];

// ── Slow cinematic animation variants ────────────────────────

const WISDOM_ANIMS = [
  { initial: { opacity: 0 },                         exit: { opacity: 0 } },
  { initial: { opacity: 0, scale: 0.97 },            exit: { opacity: 0, scale: 1.03 } },
  { initial: { opacity: 0, y: 18 },                  exit: { opacity: 0, y: -18 } },
  { initial: { opacity: 0, y: -14 },                 exit: { opacity: 0, y: 14 } },
  { initial: { opacity: 0, x: 22, scale: 0.98 },     exit: { opacity: 0, x: -22, scale: 0.98 } },
];

// ── Canvas image download helper ─────────────────────────────

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, y);
      line = word + " ";
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y;
}

function downloadQuoteImage(quote: SavedQuote): void {
  const W = 800, H = 460;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  quote.tilePalette.gradientStops.forEach(([color, stop]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle top border glow
  ctx.fillStyle = quote.tilePalette.accentColor + "30";
  ctx.fillRect(0, 0, W, 2);

  // Giant quote mark
  ctx.font = `bold 200px Georgia, serif`;
  ctx.fillStyle = quote.tilePalette.quoteMarkColor;
  ctx.textAlign = "left";
  ctx.fillText("“", 24, 180);

  // Category label
  ctx.font = `700 13px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = quote.tilePalette.labelColor;
  ctx.textAlign = "left";
  ctx.fillText(quote.label.toUpperCase(), 48, 60);

  // Quote text
  ctx.font = `600 26px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = quote.tilePalette.quoteColor;
  const lastY = wrapCanvasText(ctx, quote.quote, 48, 130, W - 96, 40);

  // Author
  if (quote.author) {
    ctx.font = `400 17px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = quote.tilePalette.authorColor;
    ctx.fillText(`— ${quote.author}`, 48, lastY + 50);
  }

  // P1 branding
  ctx.font = `700 13px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = quote.tilePalette.accentColor + "80";
  ctx.textAlign = "right";
  ctx.fillText("Percentile.One", W - 40, H - 28);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "p1-wisdom.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ── WisdomTile ───────────────────────────────────────────────

function WisdomTile({
  config,
  onSave,
}: {
  config: TileConfig;
  onSave: (quote: WisdomQuote, palette: TilePalette) => void;
}) {
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * config.quotes.length));
  const [justSaved, setJustSaved] = useState(false);
  const animRef  = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = 20000 + Math.random() * 25000; // 20–45 s
      timerRef.current = setTimeout(() => {
        animRef.current = Math.floor(Math.random() * WISDOM_ANIMS.length);
        setQuoteIdx((prev) => {
          let next = Math.floor(Math.random() * config.quotes.length);
          while (next === prev && config.quotes.length > 1) {
            next = Math.floor(Math.random() * config.quotes.length);
          }
          return next;
        });
        schedule();
      }, delay);
    };
    // per-tile jitter so tiles are never in sync
    timerRef.current = setTimeout(schedule, Math.random() * 8000 + 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    onSave(config.quotes[quoteIdx], config.palette);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  };

  const { palette } = config;
  const anim         = WISDOM_ANIMS[animRef.current];
  const currentQuote = config.quotes[quoteIdx];

  return (
    <div
      className="relative flex-1 min-w-0 rounded-2xl overflow-hidden"
      style={{
        height: "185px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        boxShadow: palette.shadow,
      }}
    >
      {/* Giant decorative quote mark */}
      <div
        className="absolute top-0 left-2 text-[90px] font-serif leading-none select-none pointer-events-none"
        style={{ color: palette.quoteMarkColor, lineHeight: 1, top: "-8px" }}
      >
        &ldquo;
      </div>

      {/* Category label — top left */}
      <div className="absolute top-3 left-4 z-10">
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: palette.labelColor }}
        >
          {config.name}
        </span>
      </div>

      {/* Save button — top right */}
      <motion.button
        onClick={handleSave}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.88 }}
        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: `1px solid ${palette.border}`,
        }}
        title="Save to Wisdom Library"
      >
        <AnimatePresence mode="wait" initial={false}>
          {justSaved ? (
            <motion.span
              key="sparkle"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles size={12} style={{ color: palette.accentColor }} />
            </motion.span>
          ) : (
            <motion.span
              key="bookmark"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Bookmark size={12} style={{ color: "rgba(148,163,184,0.55)" }} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Animated quote content */}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={quoteIdx}
          initial={anim.initial}
          animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
          exit={anim.exit}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 px-4 pt-10 pb-5 flex flex-col justify-center"
        >
          <p
            className="text-[13px] font-semibold leading-relaxed line-clamp-4"
            style={{ color: palette.quoteColor }}
          >
            {currentQuote.quote}
          </p>
          {currentQuote.author && (
            <p
              className="text-[10px] mt-2 font-medium"
              style={{ color: palette.authorColor }}
            >
              &mdash; {currentQuote.author}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Saved Quote Card (inside Library modal) ──────────────────

function SavedQuoteCard({
  quote,
  onDelete,
}: {
  quote: SavedQuote;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = `"${quote.quote}"${quote.author ? `\n— ${quote.author}` : ""}\n\nvia Percentile.One`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: copyText, title: "P1 Wisdom" }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: quote.tilePalette.bg,
        border: `1px solid ${quote.tilePalette.border}`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
        minHeight: "130px",
      }}
    >
      {/* Decorative quote mark */}
      <div
        className="absolute top-0 left-1.5 text-[52px] font-serif leading-none select-none pointer-events-none"
        style={{ color: quote.tilePalette.quoteMarkColor, lineHeight: 1, top: "-4px" }}
      >
        &ldquo;
      </div>

      <div className="px-3.5 pt-9 pb-3">
        {/* Label */}
        <span
          className="text-[8px] font-bold uppercase tracking-widest block mb-1.5"
          style={{ color: quote.tilePalette.labelColor }}
        >
          {quote.label}
        </span>
        {/* Quote */}
        <p
          className="text-[11px] font-semibold leading-relaxed line-clamp-3"
          style={{ color: quote.tilePalette.quoteColor }}
        >
          {quote.quote}
        </p>
        {quote.author && (
          <p
            className="text-[10px] mt-1.5 font-medium"
            style={{ color: quote.tilePalette.authorColor }}
          >
            &mdash; {quote.author}
          </p>
        )}

        {/* Action row */}
        <div className="flex items-center gap-1.5 mt-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: copied ? quote.tilePalette.accentColor : "rgba(148,163,184,0.65)",
            }}
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.65)" }}
          >
            <Share2 size={9} /> Share
          </button>
          <button
            onClick={() => downloadQuoteImage(quote)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.65)" }}
          >
            <Download size={9} /> Save
          </button>
          <button
            onClick={onDelete}
            className="ml-auto flex items-center justify-center w-6 h-6 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.35)" }}
            title="Remove"
          >
            <X size={9} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Wisdom Library Modal ─────────────────────────────────────

function WisdomLibraryModal({
  quotes,
  onClose,
  onDelete,
}: {
  quotes: SavedQuote[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[82vh] flex flex-col rounded-2xl border border-white/[0.09]"
        style={{
          background: "rgba(16,18,28,0.98)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark size={14} className="text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Wisdom Library</h2>
            {quotes.length > 0 && (
              <span className="text-[10px] text-slate-500 ml-0.5">
                ({quotes.length} saved)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/[0.07] text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Quote grid */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Bookmark size={26} className="text-slate-700" />
              <p className="text-sm text-slate-500">Your library is empty.</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Tap the bookmark icon on any Wisdom Tile to save a quote.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {quotes.map((q) => (
                <SavedQuoteCard key={q.id} quote={q} onDelete={() => onDelete(q.id)} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── WisdomWall (export) ──────────────────────────────────────

export default function WisdomWall() {
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleSave = (quote: WisdomQuote, palette: TilePalette, tileId: string) => {
    const newEntry: SavedQuote = {
      ...quote,
      id: `${tileId}-${Date.now()}`,
      tileId,
      tilePalette: palette,
      savedAt: new Date(),
    };
    setSavedQuotes((prev) => [newEntry, ...prev]);
  };

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Wisdom Wall
          </span>
        </div>
        <button
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors border border-white/[0.06]"
        >
          <Bookmark size={10} />
          Library
          {savedQuotes.length > 0 && (
            <span className="text-indigo-400 font-bold">{savedQuotes.length}</span>
          )}
        </button>
      </div>

      {/* Tile cluster */}
      <div className="flex gap-3">
        {WISDOM_TILES.map((tile) => (
          <WisdomTile
            key={tile.id}
            config={tile}
            onSave={(quote, palette) => handleSave(quote, palette, tile.id)}
          />
        ))}
      </div>

      {/* Library modal */}
      <AnimatePresence>
        {showLibrary && (
          <WisdomLibraryModal
            quotes={savedQuotes}
            onClose={() => setShowLibrary(false)}
            onDelete={(id) => setSavedQuotes((prev) => prev.filter((q) => q.id !== id))}
          />
        )}
      </AnimatePresence>
    </>
  );
}
