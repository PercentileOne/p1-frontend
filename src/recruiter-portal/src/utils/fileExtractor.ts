import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker to avoid Vite bundling issues with pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export type ExtractResult = { text: string; fileName: string };

async function extractPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? (item as { str?: string }).str ?? '' : '')).join(' '));
  }
  return pages.join('\n');
}

async function extractDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function extractTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let text = '';

  if (ext === 'pdf') {
    text = await extractPdf(file);
  } else if (ext === 'docx' || ext === 'doc') {
    text = await extractDocx(file);
  } else if (ext === 'txt') {
    text = await extractTxt(file);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please use PDF, DOCX, or TXT.`);
  }

  if (!text.trim()) throw new Error('Could not extract text from this file. Please try pasting the content instead.');
  return { text: text.trim(), fileName: file.name };
}
