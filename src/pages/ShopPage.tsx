import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Sparkles, Heart, X, ExternalLink,
  Star, Target,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";

/* ══════════════════════════════════════════════════════════════
   SHOP MODULE  /shop
   "Tools for Today" + "The Future You"
   ══════════════════════════════════════════════════════════════ */

type Tab = "today" | "future";

/* ─── Product types ─────────────────────────────────────────── */
interface Product {
  id:        string;
  emoji:     string;   // fallback only
  image?:    string;   // real product photo URL
  url:       string;   // external buy link
  title:     string;
  price?:    string;
  category:  string;
  why:       string;
  tag:       string;
  tagColor:  string;
  brand?:    string;
  featured?: boolean;
}

/* ─── Tools for Today ───────────────────────────────────────── */
const TOOLS_TODAY: Product[] = [
  {
    id: "t1", emoji: "🎧",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    url: "https://www.sony.co.uk/en/headphones/products/wh-1000xm6",
    title: "Sony WH-1000XM6 Headphones", price: "£279",
    category: "Productivity", brand: "Sony",
    why: "Noise cancellation eliminates distractions during deep work sessions. Pairs perfectly with your Focus Mode.",
    tag: "Focus", tagColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", featured: true,
  },
  {
    id: "t2", emoji: "📚",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
    url: "https://www.amazon.co.uk/dp/B0CNPGK2Z5",
    title: "Kindle Paperwhite 2026", price: "£119",
    category: "Study", brand: "Amazon",
    why: "Read without screen glare. Your study sessions are longer when you use e-ink. Proven by your Focus data.",
    tag: "Study", tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "t3", emoji: "🏃",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    url: "https://www.nike.com/gb/t/pegasus-41-road-running-shoes",
    title: "Nike Pegasus 41 Running Shoes", price: "£134",
    category: "Fitness", brand: "Nike",
    why: "Your morning run is your highest-proof habit. The right shoe reduces injury risk and sustains your 12-day streak.",
    tag: "Fitness", tagColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "t4", emoji: "💧",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80",
    url: "https://www.hydroflask.com/40-oz-wide-mouth",
    title: "Hydro Flask 40oz Wide Mouth", price: "£42",
    category: "Health", brand: "Hydro Flask",
    why: "You're hitting 1.2L of 2.5L daily. A larger bottle on your desk means you sip without thinking.",
    tag: "Health", tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "t5", emoji: "🖥️",
    image: "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&q=80",
    url: "https://www.flexispot.co.uk/standing-desk-converters.html",
    title: "Standing Desk Converter — FlexiSpot", price: "£89",
    category: "Office", brand: "FlexiSpot",
    why: "Your focus blocks average 90 minutes. Standing for half reduces fatigue and increases output quality.",
    tag: "Productivity", tagColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "t6", emoji: "⌨️",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
    url: "https://www.keychron.com/products/keychron-q3-pro-qmk-via-wireless-custom-mechanical-keyboard",
    title: "Keychron Q3 Pro Mechanical Keyboard", price: "£169",
    category: "Productivity", brand: "Keychron",
    why: "As a developer-founder, your keyboard is your primary tool. Better tactile feedback = faster output.",
    tag: "Dev", tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "t7", emoji: "🧴",
    image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=600&q=80",
    url: "https://drinkag1.com/en-gb",
    title: "AG1 Athletic Greens Daily Pack", price: "£89/mo",
    category: "Supplements", brand: "AG1",
    why: "Single-supplement morning ritual. Matches your existing routine and fills nutritional gaps from your meal plan.",
    tag: "Health", tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "t8", emoji: "⏱️",
    image: "https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=600&q=80",
    url: "https://www.timetimer.com/products/time-timer-mod",
    title: "Time Timer MOD 60-Minute Visual", price: "£34",
    category: "Focus", brand: "Time Timer",
    why: "Physical countdown makes time tangible. Pairs with your 90-minute focus blocks for deep work sessions.",
    tag: "Focus", tagColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "t9", emoji: "🖊️",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
    url: "https://www.amazon.co.uk/s?k=glass+whiteboard+90x60",
    title: "Whiteboard Glass Panel — 90×60cm", price: "£119",
    category: "Planning", brand: "Navaris",
    why: "Your planning module is digital — your thinking space should be physical. A glass board never runs out of battery.",
    tag: "Planning", tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "t10", emoji: "💍",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    url: "https://ouraring.com/product/rings",
    title: "Oura Ring Gen 4", price: "£299",
    category: "Health", brand: "Oura",
    why: "You track focus data. Now track recovery data. HRV + sleep scores tell you when to push and when to rest.",
    tag: "Health", tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "t11", emoji: "📖",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80",
    url: "https://www.amazon.co.uk/dp/173748036X",
    title: "$100M Offers — Alex Hormozi", price: "£14",
    category: "Books", brand: "Book",
    why: "Your P1 income goal is active. This book teaches you how to make an offer so good people feel stupid saying no.",
    tag: "Business", tagColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "t12", emoji: "💻",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    url: "https://www.amazon.co.uk/s?k=anker+usb-c+hub+4+port",
    title: "Anker 4-Port USB-C Hub Pro", price: "£49",
    category: "Office", brand: "Anker",
    why: "Clean desk = clear mind. One cable. Four ports. No friction between you and your flow state.",
    tag: "Setup", tagColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
];

/* ─── The Future You ────────────────────────────────────────── */
const FUTURE_YOU: Product[] = [
  {
    id: "f1", emoji: "💻",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    url: "https://www.apple.com/uk/shop/buy-mac/macbook-pro/16-inch",
    title: "Apple MacBook Pro M4 Max 16\"", price: "£3,999",
    category: "Technology", brand: "Apple",
    why: "The tool of elite founders. When your P1 platform is generating revenue, this is the upgrade that matches your level.",
    tag: "Founder", tagColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", featured: true,
  },
  {
    id: "f2", emoji: "⌚",
    image: "https://media.rolex.com/image/upload/q_auto:eco/f_auto/t_v7-majesty/c_limit,w_1920/v1/catalogue/2024/upright-bba-with-shadow/m126610lv-0002",
    url: "https://www.rolex.com/en-gb/watches/submariner/submariner-date.html",
    title: "Rolex Submariner Date", price: "£10,500",
    category: "Luxury", brand: "Rolex",
    why: "A symbol of achievement earned, not inherited. The watch you buy when your first product crosses £1M ARR.",
    tag: "Identity", tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "f3", emoji: "🪑",
    image: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600&q=80",
    url: "https://www.hermanmiller.com/en_gb/products/seating/office-chairs/aeron-chairs/",
    title: "Herman Miller Aeron Chair", price: "£1,495",
    category: "Office", brand: "Herman Miller",
    why: "Billionaires sit here too. Your body is your hardware — invest in it. You'll work 12+ hour days for years.",
    tag: "Setup", tagColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
  {
    id: "f4", emoji: "🚗",
    image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80",
    url: "https://www.tesla.com/en_gb/model3",
    title: "Tesla Model 3 Performance", price: "£48,990",
    category: "Transport", brand: "Tesla",
    why: "Zero-emission, tech-forward, and built for the road ahead. Matches your values and your trajectory.",
    tag: "Lifestyle", tagColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "f5", emoji: "🏠",
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80",
    url: "https://www.amazon.co.uk/s?k=home+office+setup+dual+monitor",
    title: "Founder Home Office Setup", price: "£8,500",
    category: "Office", brand: "Custom",
    why: "A purpose-built creative HQ. Dual monitors, standing desk, acoustic panels, ambient lighting. Work like a CEO.",
    tag: "Setup", tagColor: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
  {
    id: "f6", emoji: "👔",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80",
    url: "https://www.henrypoole.com",
    title: "Bespoke Tailored Suit — Henry Poole", price: "£4,200",
    category: "Wardrobe", brand: "Henry Poole",
    why: "Investor meetings, keynotes, and launches. The suit that tells the room you built something real.",
    tag: "Identity", tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "f7", emoji: "✈️",
    image: "https://images.unsplash.com/photo-1540339832862-474599807836?w=600&q=80",
    url: "https://www.britishairways.com/en-gb/information/about-ba/fleet-and-cabin-information/club-world",
    title: "Business Class — Lagos Return", price: "£3,800",
    category: "Travel", brand: "British Airways",
    why: "You'll fly business when the work justifies it. And it will. This is the version of you you're building toward.",
    tag: "Lifestyle", tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "f8", emoji: "🏋️",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80",
    url: "https://www.onepeloton.co.uk/bikes/bike-plus",
    title: "Peloton Bike+ Home Studio", price: "£2,295",
    category: "Fitness", brand: "Peloton",
    why: "Your fitness data shows morning workouts are non-negotiable. A home studio removes every friction point.",
    tag: "Fitness", tagColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
  {
    id: "f9", emoji: "🎨",
    image: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=600&q=80",
    url: "https://www.99designs.co.uk/brand-identity-design",
    title: "Custom Brand Identity Package", price: "£5,000",
    category: "Brand", brand: "Studio",
    why: "P1 will go global. A world-class visual identity is the difference between a product and a movement.",
    tag: "Business", tagColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "f10", emoji: "🌍",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&q=80",
    url: "https://www.eonetwork.org",
    title: "Entrepreneur Mastermind Retreat", price: "£12,000",
    category: "Network", brand: "YPO / EO",
    why: "The right room changes everything. One relationship from a mastermind can be worth 10x the investment.",
    tag: "Growth", tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
];

/* ─── Agent recommendations ─────────────────────────────────── */
const AGENT_RECO: { tab: Tab; id: string; reason: string }[] = [
  { tab: "today",  id: "t1",  reason: "Your Focus data shows peak sessions are interrupted by ambient noise. WH-1000XM6 has the best ANC on the market." },
  { tab: "today",  id: "t10", reason: "You track focus but not recovery. HRV data from Oura will tell you when you're ready for a hard push." },
  { tab: "future", id: "f1",  reason: "Your dev output is 3+ hours daily. An M4 Max will cut compile times by 60% and handle anything P1 throws at it." },
];

/* ══════════════════════════════════════════════════════════════
   SHOP PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ShopPage() {

  const [tab,     setTab]     = useState<Tab>("today");
  const [modal,   setModal]   = useState<Product | null>(null);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set(["f1", "t1"]));
  const [search,  _setSearch]  = useState("");

  const products  = tab === "today" ? TOOLS_TODAY : FUTURE_YOU;
  const filtered  = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const agentItems = AGENT_RECO.filter(r => r.tab === tab)
    .map(r => ({ ...r, product: [...TOOLS_TODAY, ...FUTURE_YOU].find(p => p.id === r.id)! }));

  const toggleWishlist = (id: string) =>
    setWishlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-3 mb-3">
          <BackToCockpit />
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag size={15} className="text-indigo-400" />
            <h1 className="text-sm font-bold text-white">Shop</h1>
          </div>
          <span className="text-[11px] text-slate-500">{wishlist.size} in wishlist</span>
          <Heart size={15} className={wishlist.size > 0 ? "text-rose-400" : "text-slate-600"} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
          {([
            { key: "today",  label: "🛠️  Tools for Today"   },
            { key: "future", label: "✨  The Future You"    },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                tab === t.key ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Agent recommendations */}
        {agentItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={12} className="text-indigo-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recommended by Your Agent</p>
            </div>
            <div className="space-y-2">
              {agentItems.map(({ product, reason }) => (
                <motion.button key={product.id} whileHover={{ x: 2 }}
                  onClick={() => setModal(product)}
                  className="w-full flex items-start gap-3 p-3.5 bg-indigo-600/8 border border-indigo-500/15 rounded-xl text-left hover:border-indigo-500/30 transition-all">
                  <span className="text-2xl shrink-0">{product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{product.title}</p>
                    <p className="text-[11px] text-indigo-300 mt-1 leading-snug">{reason}</p>
                  </div>
                  {product.price && (
                    <span className="text-xs font-bold text-green-400 shrink-0">{product.price}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Tab description */}
        <div className="p-4 bg-[#1c1f2e] border border-white/[0.08] rounded-2xl">
          {tab === "today" ? (
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-white font-semibold">Tools for Today</span> — curated for where you are right now.
              Every item is agent-selected based on your goals, habits, focus patterns, and profession.
              These tools help you execute, recover, and compound.
            </p>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-white font-semibold">The Future You</span> — aspirational items that match the identity you're building.
              You don't need these today. But knowing what you're working toward
              is one of the most powerful motivational forces there is. See it. Feel it. Build toward it.
            </p>
          )}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p}
              wishlisted={wishlist.has(p.id)}
              onToggleWishlist={() => toggleWishlist(p.id)}
              onOpen={() => setModal(p)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag size={24} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No products found.</p>
          </div>
        )}

      </div>
      <div className="h-8" />

      {/* Product modal */}
      <AnimatePresence>
        {modal && (
          <ProductModal
            product={modal}
            wishlisted={wishlist.has(modal.id)}
            onToggleWishlist={() => toggleWishlist(modal.id)}
            onClose={() => setModal(null)}
            tab={tab}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Product Card ──────────────────────────────────────────── */
function ProductCard({ product: p, wishlisted, onToggleWishlist, onOpen }: {
  product: Product; wishlisted: boolean; onToggleWishlist: () => void; onOpen: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex flex-col bg-[#1c1f2e] border rounded-2xl overflow-hidden cursor-pointer ${
        p.featured ? "border-indigo-500/35" : "border-white/[0.07]"
      }`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.35)" }}
    >
      {/* ── Hero image — 4:3 aspect ratio, full card width ────── */}
      <div
        className="relative w-full shrink-0"
        style={{ paddingBottom: "75%", background: "#f7f7f7" }}
        onClick={onOpen}
      >
        <img
          src={p.image ?? ""}
          alt={p.title}
          className="absolute inset-0 w-full h-full object-contain p-4"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) { fb.style.display = "flex"; }
          }}
        />
        {/* Clean neutral fallback — no emoji, no text */}
        <div
          className="absolute inset-0 items-center justify-center"
          style={{ display: "none", background: "#ececec" }}
        >
          <ShoppingBag size={28} style={{ color: "#c0c0c0" }} />
        </div>

        {/* Wishlist heart — floating on image */}
        <button
          onClick={e => { e.stopPropagation(); onToggleWishlist(); }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            wishlisted
              ? "bg-rose-500 text-white"
              : "bg-white/80 text-slate-400 hover:text-rose-500"
          }`}
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
        >
          <Heart size={12} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* Featured badge */}
        {p.featured && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-600 border border-indigo-400/30">
            <Star size={8} className="text-white" fill="currentColor" />
            <span className="text-[9px] text-white font-bold tracking-wide">Top Pick</span>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-3 pt-3 pb-0" onClick={onOpen}>
        {/* Name — primary, bold */}
        <p className="text-[11px] font-bold text-white leading-snug line-clamp-2 mb-1">{p.title}</p>

        {/* Price — prominent, below name */}
        {p.price && (
          <p className="text-sm font-extrabold text-green-400 mb-2">{p.price}</p>
        )}

        {/* Category tag — small, subtle */}
        <span className={`self-start text-[9px] font-semibold px-1.5 py-0.5 rounded border mb-2 ${p.tagColor}`}>
          {p.tag}
        </span>

        {/* Agent insight — one line max */}
        <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 pb-3">{p.why}</p>
      </div>

      {/* ── Buttons ───────────────────────────────────────────── */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={e => { e.stopPropagation(); onToggleWishlist(); }}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold transition-all shrink-0 ${
            wishlisted
              ? "bg-rose-500/15 border-rose-500/25 text-rose-400"
              : "bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15]"
          }`}
        >
          <Heart size={10} fill={wishlisted ? "currentColor" : "none"} />
          {wishlisted ? "Saved" : "Wishlist"}
        </button>
        {p.price && (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold hover:bg-indigo-600/40 hover:text-indigo-200 transition-all"
          >
            <ExternalLink size={10} /> Buy
          </a>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Product Modal ─────────────────────────────────────────── */
function ProductModal({ product: p, wishlisted, onToggleWishlist, onClose, tab }: {
  product: Product; wishlisted: boolean; onToggleWishlist: () => void; onClose: () => void; tab: Tab;
}) {
  // ESC to close
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Escape") onClose(); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
      onKeyDown={handleKey}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{
          background: "rgba(18,20,30,0.97)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.08)",
        }}>

        {/* Image header */}
        <div className="h-36 bg-[#161820] flex items-center justify-center relative overflow-hidden">
          {p.image ? (
            <img
              src={p.image}
              alt={p.title}
              className="w-full h-full object-contain p-4"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fb = img.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
          ) : null}
          {/* Fallback */}
          <div
            className="absolute inset-0 items-center justify-center bg-[#161820]"
            style={{ display: p.image ? "none" : "flex" }}>
            <span className="text-6xl">{p.emoji}</span>
          </div>
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10">
            <X size={13} />
          </button>
          {p.featured && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/40 border border-indigo-500/40 z-10">
              <Star size={10} className="text-indigo-300" />
              <span className="text-[10px] text-indigo-200 font-bold">Agent Top Pick</span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Title + price */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-white leading-snug">{p.title}</h2>
              {p.price && <p className="text-base font-bold text-green-400 shrink-0">{p.price}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${p.tagColor}`}>{p.tag}</span>
              <span className="text-[10px] text-slate-500">{p.category}</span>
              {p.brand && <span className="text-[10px] text-slate-600">· {p.brand}</span>}
            </div>
          </div>

          {/* Why */}
          <div className={`p-4 rounded-xl border ${tab === "today" ? "bg-indigo-600/8 border-indigo-500/15" : "bg-amber-500/8 border-amber-500/15"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={11} className={tab === "today" ? "text-indigo-400" : "text-amber-400"} />
              <p className={`text-[10px] font-bold ${tab === "today" ? "text-indigo-300" : "text-amber-300"}`}>
                {tab === "today" ? "Why this helps you today" : "Why this aligns with your future identity"}
              </p>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{p.why}</p>
          </div>

          {/* Goal link */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Target size={11} className="text-indigo-400 shrink-0" />
            <span>Linked to: <span className="text-indigo-300 font-semibold">
              {tab === "today" ? "Daily performance" : "Long-term identity & vision"}
            </span></span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onToggleWishlist}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                wishlisted ? "bg-rose-500/15 border-rose-500/25 text-rose-400" : "bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white"
              }`}>
              <Heart size={14} fill={wishlisted ? "currentColor" : "none"} />
              {wishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
            </button>
            {p.price && (
              <motion.a
                href={p.url} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
                <ExternalLink size={14} /> Buy Now
              </motion.a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}