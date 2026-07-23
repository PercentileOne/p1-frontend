import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractTextFromFile } from '../utils/fileExtractor';

interface Props {
  onExtracted: (text: string, fileName: string) => void;
  label?: string;
}

type UploadState = 'idle' | 'extracting' | 'done' | 'error';

export function FileUpload({ onExtracted, label = 'CV' }: Props) {
  const [state, setState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    setState('extracting');
    setFileName(file.name);
    setErrorMsg('');
    try {
      const { text, fileName: name } = await extractTextFromFile(file);
      setState('done');
      setFileName(name);
      onExtracted(text, name);
    } catch (e: unknown) {
      setState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Failed to read file.');
    }
  }, [onExtracted]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, [process]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) process(file);
  }, [process]);

  const reset = () => {
    setState('idle');
    setFileName('');
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />

      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(79,142,247,0.06)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📄</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              Drop your {label} here or <span style={{ color: 'var(--blue)' }}>browse</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>PDF, DOCX, or TXT · Max 10MB</div>
          </motion.div>
        )}

        {state === 'extracting' && (
          <motion.div
            key="extracting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ width: '28px', height: '28px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 12px' }}
            />
            <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Extracting text from <strong>{fileName}</strong>…</div>
          </motion.div>
        )}

        {state === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{ fontSize: '20px' }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{fileName}</div>
              <div style={{ fontSize: '12px', color: '#34D399' }}>Text extracted successfully</div>
            </div>
            <button onClick={reset} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>
              Change
            </button>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', borderRadius: '12px', padding: '16px 20px' }}
          >
            <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '10px' }}>{errorMsg}</div>
            <button onClick={reset} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
