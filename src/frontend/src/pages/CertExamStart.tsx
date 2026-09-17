import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { logFlowEvent } from '../api/flowLogger';
import {
  searchExamCatalog, getExamCategories, reportMissingExam, categoryLabel,
  type ExamCatalogEntry, type CategoryCount,
} from '../api/examCatalogApi';

// Intake screen for the Certifications & Exams mode — copy-trimmed from InterviewPackStart.tsx's
// shell (card layout, validation-on-attempt, back button, header treatment), but the picker
// itself is new: a category dropdown ("Certification" default) plus a type-ahead search scoped
// to it, backed by the live exam-catalog Function App instead of a static list. The search
// interaction (180ms debounce, request-id race guard, mouse-down selection, "Searching…" row,
// overflow:visible while open) is copied from InterviewPackStart's own job-title type-ahead —
// no shared component exists for this in the codebase, so this mirrors its proven details
// exactly rather than inventing new ones.

const QUESTION_COUNTS = [15, 30, 60];
const DEFAULT_CATEGORY = 'certification';

export default function CertExamStart() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryCount[]>([{ category: DEFAULT_CATEGORY, count: 0 }]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExamCatalogEntry | null>(null);
  const [suggestions, setSuggestions] = useState<ExamCatalogEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const lastMatchedRef = useRef<string | null>(null);

  const [questionCount, setQuestionCount] = useState(30);
  const [preferredName, setPreferredName] = useState('');
  const [attemptedStart, setAttemptedStart] = useState(false);

  useEffect(() => {
    logFlowEvent('CERT_EXAM_PICKER_VIEW');
    getExamCategories().then(cats => { if (cats.length > 0) setCategories(cats); });
  }, []);

  function changeCategory(next: string) {
    setCategory(next);
    setCategoryMenuOpen(false);
    setQuery('');
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      requestIdRef.current++;
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setSearching(true);
      setShowSuggestions(true);
      const results = await searchExamCatalog(value, category, 8);
      if (requestId !== requestIdRef.current) return; // a newer keystroke superseded this
      setSearching(false);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 180);
  }, [category]);

  const selectSuggestion = useCallback((entry: ExamCatalogEntry) => {
    setSelected(entry);
    setQuery(entry.name);
    lastMatchedRef.current = entry.name;
    setShowSuggestions(false);
    logFlowEvent('CERT_SELECTED', { certId: entry.id, examCode: entry.examCode, category: entry.category });
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setShowSuggestions(false), 150); // let a suggestion click register first
    const typed = query.trim();
    if (typed.length < 3 || typed === lastMatchedRef.current) return;
    const matchesKnown = suggestions.some(s => s.name.toLowerCase() === typed.toLowerCase());
    if (!matchesKnown) lastMatchedRef.current = typed;
  }, [query, suggestions]);

  async function handleReportMissing() {
    const typed = query.trim();
    if (!typed) return;
    await reportMissingExam(typed, category);
    logFlowEvent('CERT_EXAM_REPORTED_MISSING', { name: typed, category });
  }

  function handleStart() {
    if (!selected) {
      setAttemptedStart(true);
      return;
    }
    logFlowEvent('START_CERT_EXAM_CLICKED', { certId: selected.id, questionCount });
    navigate(`/cert-exam/${selected.id}`, {
      state: { certId: selected.id, questionCount, preferredName: preferredName.trim() || undefined },
    });
  }

  const suggestionsOpen = showSuggestions && (searching || suggestions.length > 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 60px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column' }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0,
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Certifications & Exams
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Pick a category, then search for your exam — Michelle will brief you, then it's a
            fully multiple-choice mock exam, scored just like the real thing.
          </p>
        </div>

        <div style={{
          background: 'var(--bg2)',
          border: `1px solid ${attemptedStart && !selected ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
          borderRadius: '16px', marginBottom: '16px', padding: '20px',
          overflow: (suggestionsOpen || categoryMenuOpen) ? 'visible' : 'hidden',
          transition: 'border-color 0.15s',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Category
          </div>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <button
              onClick={() => setCategoryMenuOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '13px 16px', color: 'var(--text)', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {categoryLabel(category)}
              <ChevronDown size={16} style={{ transform: categoryMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {categoryMenuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(79,142,247,0.3)', borderRadius: '10px', overflow: 'hidden', zIndex: 21, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                {categories.map(c => (
                  <div
                    key={c.category}
                    onMouseDown={() => changeCategory(c.category)}
                    style={{ padding: '11px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: c.category === category ? 'var(--blue)' : 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {categoryLabel(c.category)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Search
          </div>
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={`Search ${categoryLabel(category).toLowerCase()}…`}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '13px 16px', color: 'var(--text)', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
            {suggestionsOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(79,142,247,0.3)', borderRadius: '10px', overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                {searching ? (
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-3)' }}>
                    <span style={{
                      display: 'inline-block', width: '13px', height: '13px', borderRadius: '50%',
                      border: '2px solid rgba(79,142,247,0.25)', borderTopColor: 'var(--blue)',
                      animation: 'examSearchSpin 0.7s linear infinite',
                    }} />
                    Searching…
                  </div>
                ) : suggestions.map(entry => (
                  <div
                    key={entry.id}
                    onMouseDown={() => selectSuggestion(entry)}
                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{entry.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{entry.vendor}{entry.examCode ? ` · ${entry.examCode}` : ''}</div>
                    {entry.domains.length === 0 && (
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', marginTop: '3px' }}>Still being built out</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {query.trim().length >= 2 && !selected && (
            <button
              onClick={handleReportMissing}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Can't find it? Let us know →
            </button>
          )}

          {attemptedStart && !selected && (
            <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '10px' }}>Search and pick a certification or exam to continue.</div>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '16px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Number of questions
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {QUESTION_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: questionCount === n ? 'rgba(79,142,247,0.1)' : 'var(--bg3)',
                  border: `1px solid ${questionCount === n ? 'var(--blue)' : 'var(--border)'}`,
                  color: questionCount === n ? 'var(--blue)' : 'var(--text-2)',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '18px 0 10px' }}>
            Known as (optional)
          </div>
          <input
            value={preferredName}
            onChange={e => setPreferredName(e.target.value)}
            placeholder="How should Michelle address you?"
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '11px 14px', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <style>{`
          @keyframes examSearchSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <motion.button
          onClick={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none',
            borderRadius: '13px', padding: '16px', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
          }}
        >
          Begin Exam →
        </motion.button>
      </motion.div>
    </div>
  );
}
