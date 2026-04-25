/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as mammoth from 'mammoth';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileText,
  Copy,
  Download,
  Check,
  X,
  ChevronRight,
  ArrowLeft,
  FileUp,
  Printer
} from 'lucide-react';
import { cn } from './lib/utils';
import turnitinLogoSrc from './lib/asset/330px-Turnitin_logo_(2021).svg.png';
import aiIllustrationSrc from './lib/asset/Screenshot2.svg.png';
import uniLogoSrc from './lib/asset/uniLogo.svg.png';

interface ConversionResult {
  text: string;
  html?: string;
  fileName: string;
  fileSize: number;
}

export default function App() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textOutputRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Please upload a valid .docx file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const conversionResult = await mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer.slice(0) });

      setResult({
        text: conversionResult.value,
        html: htmlResult.value,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('Error converting file:', err);
      setError('Failed to convert the file. It might be corrupted or in an unsupported format.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
  });

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const element = document.createElement('a');
    const file = new Blob([result.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${result.fileName.replace('.docx', '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePrintToPdf = async () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = result.html || result.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const docName = result.fileName.replace('.docx', '');

    // ── Computed stats ──
    const wordCount = result.text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const charCount = result.text.length;
    const estimatedDocPages = Math.max(1, Math.ceil(wordCount / 280));
    const fileSizeStr = formatFileSize(result.fileSize);

    // ── Dates ──
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'shortOffset'
    });
    const submissionDate = fmt(now);
    const downloadDate = fmt(new Date(now.getTime() + 4 * 60000));

    // ── Submission ID ──
    const raw = result.fileName + result.fileSize;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const part1 = Math.abs(hash).toString().padStart(4, '0').slice(0, 4);
    const part2 = Math.abs(hash * 31 + 7).toString().padStart(9, '0').slice(0, 9);
    const submissionId = `trn:oid::${part1}:${part2}`;

    // ── Convert Images to Base64 (Robust Canvas Method) ──
    const imageToBase64 = (url: string): Promise<string> => {
      return new Promise((resolve) => {
        const absoluteUrl = new URL(url, window.location.origin).href;
        // If it's already a data URL, return it
        if (absoluteUrl.startsWith('data:')) {
          resolve(absoluteUrl);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(absoluteUrl);
          }
        };
        img.onerror = () => resolve(absoluteUrl);
        img.src = absoluteUrl;
      });
    };

    const logoDataUrl = await imageToBase64(turnitinLogoSrc);
    const aiLogoDataUrl = await imageToBase64(aiIllustrationSrc);
    const uniLogoDataUrl = await imageToBase64(uniLogoSrc);

    // ── Shared header/footer band HTML ──
    const getBandHTML = (pageNum: number, total: number) => `
      <div class="band-left">
        <img src="${logoDataUrl}" class="logo-img" alt="turnitin" />
        <div class="pipe"></div>
        <span class="page-info">Page ${pageNum} of <span class="total-pages">${total}</span></span>
      </div>
      <div class="band-right">
        <span class="band-label">Submission ID</span>
        <span class="band-id">&nbsp;&nbsp;${submissionId}</span>
      </div>`;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${docName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #111;
      background: #fff;
      padding-top: 48px;
      padding-bottom: 48px;
    }

    /* ── Headers & footers (injected via JS per page) ── */
    .page-header, .page-footer {
      position: absolute;
      left: 28px; right: 28px;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      z-index: 1000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-header { border-bottom: 1px solid #d0d5dd; }
    .page-footer { border-top: 1px solid #d0d5dd; }

    /* Band: left side */
    .band-left { display: flex; align-items: center; gap: 0; }
    .logo-img {
      height: 22px; width: auto; display: block;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .pipe {
      width: 1px; height: 14px; background: #c8cdd4;
      margin: 0 10px; flex-shrink: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .page-info { font-size: 7.5pt; color: #5a6272; }

    /* Band: right side */
    .band-right { display: flex; align-items: center; font-size: 7.5pt; }
    .band-label { color: #5a6272; }
    .band-id {
      color: #5a6272; font-weight: 500;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }

    /* ══ COVER PAGE ══ */
    .cover-page {
      height: calc(297mm - 96px);
      padding: 0 28px 1.8cm 28px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    /* Title */
    .cover-title {
      font-size: 19pt;
      font-weight: 700;
      color: #111;
      line-height: 1.25;
      margin-bottom: 10px;
    }

    /* "Turnitin" brand row */
    .cover-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 18px;
    }
    .cover-brand-logo {
      height: 17px; width: auto;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .cover-brand-name {
      font-size: 9pt;
      color: #444;
    }

    /* Divider */
    .cover-rule {
      border: none;
      border-top: 1px solid #ccc;
      margin-bottom: 18px;
    }

    /* Document Details */
    .details-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 14px;
    }
    .details-grid {
      display: flex;
      gap: 2cm;
      align-items: flex-start;
    }
    .details-left { flex: 1; }
    .detail-item { margin-bottom: 13px; }
    .detail-label {
      font-size: 7.5pt;
      color: #888888;
      margin-bottom: 2px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .detail-value {
      font-size: 8.5pt;
      font-weight: 700;
      color: #111;
    }
    .detail-value.blue {
      color: #1464A5;
      font-weight: 700;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }

    /* Stats box */
    .stats-box {
      background: #f5f6f7;
      border: 1px solid #e4e6e9;
      padding: 14px 20px;
      min-width: 150px;
      flex-shrink: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .stats-box div {
      font-size: 9pt;
      font-weight: 700;
      color: #111;
      padding: 7px 0;
    }

    /* ── Page break ── */
    .page-break {
      page-break-after: always;
      break-after: page;
      height: 0;
    }

    /* ── Document content ── */
    .doc-content { padding: 0 28px; }
    .doc-html-content {
      font-family: Georgia, serif;
      font-size: 11pt;
      line-height: 1.85;
      color: #111;
    }
    .doc-html-content p { margin-bottom: 1em; }
    .doc-html-content img { max-width: 100%; height: auto; margin: 1em auto; display: block; }
    .doc-html-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
    .doc-html-content td, .doc-html-content th { border: 1px solid #ccc; padding: 6px; }
    .doc-html-content h1, .doc-html-content h2, .doc-html-content h3 { font-weight: bold; margin-bottom: 0.5em; line-height: 1.3; }
    .doc-html-content ul, .doc-html-content ol { margin-left: 20px; margin-bottom: 1em; }
    .doc-html-content li { margin-bottom: 0.5em; }
    pre {
      font-family: Georgia, serif;
      font-size: 11pt;
      line-height: 1.85;
      white-space: pre-wrap;
      word-break: break-word;
      color: #111;
    }

    /* ── AI Writing Overview Page ── */
    .ai-page {
      padding: 1.2cm 28px 0.5cm 28px;
      page-break-after: always;
      break-after: page;
    }
    .ai-main {
      display: flex;
      gap: 0.8cm;
      align-items: flex-start;
      padding: 14px 0;
    }
    .ai-left { flex: 1; }
    .ai-heading {
      font-size: 20pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 6px;
      line-height: 1.1;
    }
    .ai-body {
      font-size: 9.5pt;
      color: #222;
      line-height: 1.45;
    }
    .caution-box {
      width: 45%;
      flex-shrink: 0;
      border: none;
      background: #dbeafe;
      border-radius: 8px;
      padding: 16px 20px;
      font-size: 8.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .caution-title {
      font-weight: 700;
      color: #111;
      margin-bottom: 8px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .caution-text { color: #222; }
    .ai-rule {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 0;
    }
    .disclaimer-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #111;
      margin-top: 12px;
      margin-bottom: 3px;
    }
    .disclaimer-text {
      font-size: 7.5pt;
      color: #444;
      line-height: 1.5;
    }
    /* ── Detection Groups ── */
    .detection-groups-title {
      font-size: 12pt;
      font-weight: 700;
      color: #111;
      margin: 16px 0 10px 0;
    }
    .detection-group-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }
    .detection-icon {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      margin-top: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .detection-info {}
    .detection-label {
      font-size: 9.5pt;
      font-weight: 700;
      color: #111;
      margin-bottom: 3px;
    }
    .detection-desc {
      font-size: 8.5pt;
      color: #555;
      line-height: 1.4;
    }
    .faq-title {
      font-size: 12pt;
      font-weight: 700;
      color: #111;
      margin: 14px 0 8px 0;
    }
    .faq-q {
      font-size: 9pt;
      font-weight: 700;
      color: #111;
      margin-top: 12px;
      margin-bottom: 3px;
    }
    .faq-image {
      float: right;
      width: 145px;
      margin-left: 20px;
      margin-bottom: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .faq-a {
      font-size: 9.5pt;
      color: #333;
      line-height: 1.5;
    }

    @page { size: A4; margin: 0; }
  </style>
</head>
<body>

  <!-- headers are injected dynamically -->

  <!-- ══ COVER PAGE ══ -->
  <div class="cover-page">

    <div class="cover-title">${docName}</div>

    <div class="cover-brand">
      <img src="${uniLogoDataUrl}" class="cover-brand-logo" alt="uni-logo"/>
    </div>

    <hr class="cover-rule"/>

    <div class="details-title">Document Details</div>

    <div class="details-grid">
      <div class="details-left">

        <div class="detail-item">
          <div class="detail-label">Submission ID</div>
          <div class="detail-value">${submissionId}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Submission Date</div>
          <div class="detail-value">${submissionDate}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Download Date</div>
          <div class="detail-value">${downloadDate}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">File Name</div>
          <div class="detail-value">${result.fileName}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">File Size</div>
          <div class="detail-value">${fileSizeStr}</div>
        </div>

      </div>

      <div class="stats-box">
        <div><span class="total-pages">${estimatedDocPages + 2}</span> Pages</div>
        <div>${wordCount.toLocaleString()} Words</div>
        <div>${charCount.toLocaleString()} Characters</div>
      </div>
    </div>

  </div>

  <!-- page break: cover → AI overview -->
  <div class="page-break"></div>

  <!-- ══ PAGE 2: AI WRITING OVERVIEW ══ -->
  <div class="ai-page">

    <div class="ai-main">
      <div class="ai-left">
        <div class="ai-heading">0% detected as AI</div>
        <div class="ai-body">
          The percentage indicates the combined amount of likely AI-generated text as
          well as likely AI-generated text that was also likely AI-paraphrased.
        </div>
      </div>
      <div class="caution-box">
        <div class="caution-title">Caution: Review required.</div>
        <div class="caution-text">
          It is essential to understand the limitations of AI detection before making decisions
          about a student's work. We encourage you to learn more about Turnitin's AI detection
          capabilities before using the tool.
        </div>
      </div>
    </div>
    <hr class="ai-rule"/>

    <div class="detection-groups-title">Detection Groups</div>

    <div class="detection-group-item">
      <svg class="detection-icon" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="#67e8f9"/>
        <!-- antenna -->
        <circle cx="18" cy="7" r="1.5" fill="#1a1a2e"/>
        <rect x="17.2" y="8" width="1.6" height="3" fill="#1a1a2e"/>
        <!-- head -->
        <rect x="10" y="11" width="16" height="14" rx="3" fill="#1a1a2e"/>
        <!-- ears -->
        <rect x="7" y="15" width="3" height="5" rx="1.5" fill="#1a1a2e"/>
        <rect x="26" y="15" width="3" height="5" rx="1.5" fill="#1a1a2e"/>
        <!-- eyes -->
        <rect x="13" y="15" width="3.5" height="3.5" rx="0.8" fill="#67e8f9"/>
        <rect x="19.5" y="15" width="3.5" height="3.5" rx="0.8" fill="#67e8f9"/>
        <!-- mouth grid -->
        <rect x="13" y="21" width="10" height="2" rx="0.5" fill="#67e8f9"/>
        <rect x="15.5" y="20.5" width="1" height="3" fill="#1a1a2e"/>
        <rect x="18.5" y="20.5" width="1" height="3" fill="#1a1a2e"/>
      </svg>
      <div class="detection-info">
        <div class="detection-label">0&nbsp; AI-generated only&nbsp; 0%</div>
        <div class="detection-desc">Likely AI-generated text from a large-language model.</div>
      </div>
    </div>

    <div class="detection-group-item">
      <svg class="detection-icon" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="#c4b5fd"/>
        <!-- antenna -->
        <circle cx="18" cy="7" r="1.5" fill="#3b0764"/>
        <rect x="17.2" y="8" width="1.6" height="3" fill="#3b0764"/>
        <!-- head -->
        <rect x="10" y="11" width="16" height="14" rx="3" fill="#3b0764"/>
        <!-- ears -->
        <rect x="7" y="15" width="3" height="5" rx="1.5" fill="#3b0764"/>
        <rect x="26" y="15" width="3" height="5" rx="1.5" fill="#3b0764"/>
        <!-- eyes -->
        <rect x="13" y="15" width="3.5" height="3.5" rx="0.8" fill="#c4b5fd"/>
        <rect x="19.5" y="15" width="3.5" height="3.5" rx="0.8" fill="#c4b5fd"/>
        <!-- mouth grid -->
        <rect x="13" y="21" width="10" height="2" rx="0.5" fill="#c4b5fd"/>
        <rect x="15.5" y="20.5" width="1" height="3" fill="#3b0764"/>
        <rect x="18.5" y="20.5" width="1" height="3" fill="#3b0764"/>
        <!-- gear accent -->
        <circle cx="28" cy="27" r="4" fill="#c4b5fd" stroke="#3b0764" stroke-width="1.2"/>
        <circle cx="28" cy="27" r="1.5" fill="#3b0764"/>
      </svg>
      <div class="detection-info">
        <div class="detection-label">0&nbsp; AI-generated text that was AI-paraphrased&nbsp; 0%</div>
        <div class="detection-desc">Likely AI-generated text that was likely revised using an AI-paraphrase tool or word spinner.</div>
      </div>
    </div>

    <hr class="ai-rule"/>

    <div class="disclaimer-title">Disclaimer</div>
    <div class="disclaimer-text">
      Our AI writing assessment is designed to help educators identify text that might be prepared by a generative AI tool. Our AI writing assessment may not always be accurate (i.e., our AI models
      may produce either false positive results or false negative results), so it should not be used as the sole basis for adverse actions against a student. It takes further scrutiny and human
      judgment in conjunction with an organization's application of its specific academic policies to determine whether any academic misconduct has occurred.
    </div>

    <div class="faq-title">Frequently Asked Questions</div>

    <div class="faq-q">How should I interpret Turnitin's AI writing percentage and false positives?</div>
    <div class="faq-a">
      The percentage shown in the AI writing report is the amount of qualifying text within the submission that Turnitin's AI writing
      detection model determines was either likely AI-generated text from a large-language model or likely AI-generated text that was
      likely revised using an AI paraphrase tool or word spinner.
      <br/><br/>
      <img src="${aiLogoDataUrl}" class="faq-image" alt="AI illustration" />
      False positives (incorrectly flagging human-written text as AI-generated) are a possibility in AI models.
      <br/><br/>
      AI detection scores under 20%, which we do not surface in new reports, have a higher likelihood of false positives. To reduce the
      likelihood of misinterpretation, no score or highlights are attributed and are indicated with an asterisk in the report (*%).
      <br/><br/>
      The AI writing percentage should not be the sole basis to determine whether misconduct has occurred. The reviewer/instructor
      should use the percentage as a means to start a formative conversation with their student and/or use it to examine the submitted
      assignment in accordance with their school's policies.
    </div>

    <div class="faq-q">What does 'qualifying text' mean?</div>
    <div class="faq-a">
      Our model only processes qualifying text in the form of long-form writing. Long-form writing means individual sentences
      contained in paragraphs that make up a longer piece of written work, such as an essay, a dissertation, or an article, etc.
      Qualifying text that has been determined to be likely AI-generated will be highlighted in cyan in the submission, and likely
      AI-paraphrased will be highlighted purple.
      <br/><br/>
      Non-qualifying text, such as bullet points, annotated bibliographies, etc., will not be processed and can create disparity
      between the submission highlights and the percentage shown.
    </div>

  </div>

  <!-- ══ DOCUMENT CONTENT ══ -->
  <table style="width: 100%; border: none; border-collapse: collapse;">
    <thead style="height: 65px;"><tr><td></td></tr></thead>
    <tbody><tr><td>
      <div class="doc-content doc-html-content">
        ${htmlContent}
      </div>
    </td></tr></tbody>
    <tfoot style="height: 84px;"><tr><td></td></tr></tfoot>
  </table>

  <!-- footers are injected dynamically -->
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();

    // Wait for render, measure total doc-content height, and set exact page counts
    setTimeout(() => {
      printWindow.document.body.style.position = 'relative';
      // Constrain to A4 width so text wraps the same as in print
      printWindow.document.body.style.width = '210mm';
      // Force reflow at A4 width
      printWindow.document.body.offsetHeight;

      let finalTotalPages = estimatedDocPages + 2;
      const docPre = printWindow.document.querySelector('.doc-content');
      if (docPre) {
        const textHeight = docPre.scrollHeight;
        const exactDocPages = Math.max(1, Math.ceil(textHeight / 850));
        finalTotalPages = 2 + exactDocPages;

        const pageSpans = printWindow.document.querySelectorAll('.total-pages');
        pageSpans.forEach((el) => {
          el.textContent = finalTotalPages.toString();
        });
      }

      // Inject absolute header and footer for each page
      for (let i = 1; i <= finalTotalPages; i++) {
        const header = printWindow.document.createElement('div');
        header.className = 'page-header';
        header.style.top = `calc(${i - 1} * 297mm)`;
        header.innerHTML = getBandHTML(i, finalTotalPages);

        const footer = printWindow.document.createElement('div');
        footer.className = 'page-footer';
        footer.style.top = `calc(${i} * 297mm - 46px)`;
        footer.innerHTML = getBandHTML(i, finalTotalPages);

        printWindow.document.body.appendChild(header);
        printWindow.document.body.appendChild(footer);
      }

      // Wait for all images to load before calling print()
      const images = Array.from(printWindow.document.images);
      let loadedCount = 0;

      const checkAndPrint = () => {
        loadedCount++;
        if (loadedCount >= images.length) {
          setTimeout(() => printWindow.print(), 150);
        }
      };

      if (images.length === 0) {
        printWindow.print();
      } else {
        images.forEach((img) => {
          if (img.complete) {
            checkAndPrint();
          } else {
            img.onload = checkAndPrint;
            img.onerror = checkAndPrint;
          }
        });
      }
    }, 600);
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">AI Check Turnitin</h1>
          </div>

          <nav className="flex items-center gap-4">
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={reset}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Reset
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
        {!result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                Chck Your AI Text <span className="text-blue-600">By Turnitin </span>
              </h2>
              <p className="text-lg text-gray-500 max-w-lg mx-auto">
                Fast, secure, and accurate. Your files never leave your browser.
              </p>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                "relative group cursor-pointer h-80 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 overflow-hidden",
                isDragActive
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              )}
            >
              <input {...getInputProps()} />

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm font-medium text-gray-600">Processing your document...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center"
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                      isDragActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"
                    )}>
                      <Upload className="w-10 h-10" />
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-xl font-semibold mb-1">
                        {isDragActive ? "Drop your file here" : "Choose a file or drag it here"}
                      </p>
                      <p className="text-gray-400">Word Documents (.docx)</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="absolute bottom-6 left-0 right-0 px-6">
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 justify-center text-sm font-medium">
                    <X className="w-4 h-4" />
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: <Check className="w-5 h-5" />, title: "Precision", desc: "Maintains raw text structure" },
                { icon: <Check className="w-5 h-5" />, title: "Privacy", desc: "Client-side processing" },
                { icon: <Check className="w-5 h-5" />, title: "Speed", desc: "Instant extraction" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-blue-600 mb-3">{item.icon}</div>
                  <h3 className="font-semibold mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={reset}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-900" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="text-blue-600 w-5 h-5" />
                    <h2 className="font-bold text-xl">{result.fileName}</h2>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatFileSize(result.fileSize)} • {result.text.length} characters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-12 rounded-xl font-medium transition-all",
                    copied
                      ? "bg-green-600 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .txt</span>
                </button>
                <button
                  onClick={handlePrintToPdf}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-12 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print to PDF</span>
                </button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/10 pointer-events-none rounded-3xl shadow-inner border border-gray-200" />
              <div
                ref={textOutputRef}
                className="bg-white p-8 md:p-12 rounded-3xl border border-gray-200 min-h-[500px] max-h-[80vh] overflow-y-auto font-sans text-lg text-gray-800 leading-relaxed scrollbar-hide shadow-sm [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_img]:max-w-full [&_img]:mx-auto [&_img]:h-auto [&_img]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_th]:bg-gray-100"
              >
                {result.html ? (
                  <div dangerouslySetInnerHTML={{ __html: result.html }} />
                ) : result.text ? (
                  <div className="whitespace-pre-wrap">{result.text}</div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20 italic">
                    No text content found in document.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 py-8">
              <button
                onClick={reset}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <FileUp className="w-4 h-4" />
                Upload New Document
              </button>
              <button
                onClick={() => {
                  if (textOutputRef.current) {
                    textOutputRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4 -rotate-90" />
                Back to Top
              </button>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-gray-100 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-gray-400">
            © 2026 ai_ckeck_by_tufan. All file processing happens locally.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Client-Side Engine Active
            </div>
          </div>
        </div>
      </footer>

      {/* Decorative Blur */}
      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-100/50 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="fixed bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-indigo-50/50 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/3" />
    </div>
  );
}
