import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { logFlowEvent } from '../api/flowLogger';
import {
  searchExamCatalog, getExamCategories, browseExamCategory, reportMissingExam, addExamOnDemand, categoryLabel, REGION_LABELS,
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
// '' = search across every exam type (the default since the catalog grew beyond one certification).
const REGIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' }, { value: 'uk', label: REGION_LABELS.uk }, { value: 'us', label: REGION_LABELS.us }, { value: 'global', label: REGION_LABELS.global },
];

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: '999px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'rgba(79,142,247,0.12)' : 'var(--bg3)',
    border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
    color: active ? 'var(--blue)' : 'var(--text-2)',
  };
}

function entrySub(entry: ExamCatalogEntry, showCategory: boolean): string {
  return [
    entry.board || entry.vendor, entry.examCode,
    showCategory ? categoryLabel(entry.category) : '', entry.region ? REGION_LABELS[entry.region] ?? '' : '',
  ].filter(Boolean).join(' · ');
}

export default function CertExamStart() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [browse, setBrowse] = useState<ExamCatalogEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

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

  function resetSelection() {
    setQuery('');
    setSelected(null);
    setSuggestions([]);
    setShowSuggestions(false);
  }
  function changeCategory(next: string) { setCategory(next); resetSelection(); }
  function changeRegion(next: string) { setRegion(next); resetSelection(); }

  // Browse list for a chosen exam type — type-ahead needs 2+ typed characters, which is no use to a
  // student who just wants to see "which GCSE subjects are there".
  useEffect(() => {
    if (!category) { setBrowse([]); return; }
    let cancelled = false;
    setBrowseLoading(true);
    browseExamCategory(category, region || undefined).then(rows => { if (!cancelled) { setBrowse(rows); setBrowseLoading(false); } });
    return () => { cancelled = true; };
  }, [category, region]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelected(null);
    setAddMessage(null);
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
      const results = await searchExamCatalog(value, category || undefined, 8, region || undefined);
      if (requestId !== requestIdRef.current) return; // a newer keystroke superseded this
      setSearching(false);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 180);
  }, [category, region]);

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

  // "Search anything": add an exam the catalog doesn't have yet. On success it is selected straight
  // away (its content outline is built the first time it's opened); on a rejection we still record the
  // demand for the admin, since a human may know an exam the AI check didn't recognise.
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState<{ kind: 'ok' | 'info'; text: string } | null>(null);

  async function handleAddExam() {
    const typed = query.trim();
    if (!typed || adding) return;
    setAdding(true);
    setAddMessage(null);
    const result = await addExamOnDemand(typed);
    setAdding(false);
    logFlowEvent('CERT_EXAM_ADD_ATTEMPT', { name: typed, outcome: result.status });
    if (result.status === 'ok') {
      selectSuggestion(result.entry);
      setAddMessage({ kind: 'ok', text: result.existing ? 'That one was already here — selected for you.' : 'Added! Press Begin Exam — the first time you open an exam it takes a few extra seconds to set up.' });
      return;
    }
    if (result.status === 'rejected' || result.status === 'error') await reportMissingExam(typed, category || 'certification');
    setAddMessage({ kind: 'info', text: result.reason });
  }

  // Official tests with a fixed real length (UK driving theory = 50 questions, LGV/PCV = 100) get a
  // "full test" option alongside the usual 15/30/60, so the pass mark means what it does on the day.
  const fullTestLength = selected && selected.category === 'official-tests' && selected.maxScore > 0 && selected.maxScore <= 100 ? selected.maxScore : 0;
  const questionCountOptions = fullTestLength && !QUESTION_COUNTS.includes(fullTestLength)
    ? [...QUESTION_COUNTS, fullTestLength].sort((a, b) => a - b) : QUESTION_COUNTS;

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
          overflow: suggestionsOpen ? 'visible' : 'hidden',
          transition: 'border-color 0.15s',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Region
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
            {REGIONS.map(r => (
              <button key={r.value || 'all'} onClick={() => changeRegion(r.value)} style={chipStyle(region === r.value)}>{r.label}</button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Exam type
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <button onClick={() => changeCategory('')} style={chipStyle(category === '')}>All exams</button>
            {categories.filter(c => c.count > 0).map(c => (
              <button key={c.category} onClick={() => changeCategory(c.category)} style={chipStyle(category === c.category)}>{categoryLabel(c.category)}</button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Search
          </div>
          <div style={{ position: 'relative' }}>
            <input
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onBlur={handleBlur}
              placeholder={category ? `Search ${categoryLabel(category).toLowerCase()}…` : 'Search every exam — e.g. GCSE Maths, SAT, AZ-104'}
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
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{entrySub(entry, !category)}</div>
                    {entry.domains.length === 0 && (
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#F59E0B', marginTop: '3px' }}>Set up on first use — takes a few seconds</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {category && !selected && query.trim().length < 2 && (
            <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
              {browseLoading ? (
                <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-3)' }}>Loading…</div>
              ) : browse.length === 0 ? (
                <div style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-3)' }}>Nothing here yet for this region — try another, or search above.</div>
              ) : browse.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => selectSuggestion(entry)}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{entry.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{entrySub(entry, false)}</div>
                </div>
              ))}
            </div>
          )}

          {query.trim().length >= 3 && !selected && !showSuggestions && (
            <button
              onClick={handleAddExam}
              disabled={adding}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--blue)', fontSize: '12px', fontWeight: 700, cursor: adding ? 'default' : 'pointer', padding: 0, opacity: adding ? 0.6 : 1 }}
            >
              {adding ? 'Checking that exam…' : `Can't find it? Add "${query.trim()}" →`}
            </button>
          )}
          {addMessage && (
            <div style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '8px', color: addMessage.kind === 'ok' ? '#34D399' : 'var(--text-3)' }}>{addMessage.text}</div>
          )}

          {attemptedStart && !selected && (
            <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '10px' }}>Search or browse and pick an exam to continue.</div>
          )}

          {selected && (
            <button
              onClick={() => {
                logFlowEvent('CERT_LEARN_FIRST_CLICKED', { certId: selected.id, examCode: selected.examCode });
                navigate('/dashboard?tab=learn', { state: { studyTopic: selected.name } });
              }}
              style={{
                marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px',
                padding: '12px', color: '#A5B4FC', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              📚 Learn this first — generate a course on {selected.name}
            </button>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '16px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Number of questions
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {questionCountOptions.map(n => (
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
                {n}{n === fullTestLength ? ' · full test' : ''}
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
