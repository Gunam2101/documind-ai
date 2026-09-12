export interface PDFExportOptions {
  filename: string;
  documentTitle?: string;
  numQuestions: number;
  totalMarks: number;
  difficulty: string;
  questionType: string;
  includeAnswerKey?: boolean;
  questions: any[];
}

export const exportQuestionsToPDF = (options: PDFExportOptions) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const {
    filename,
    numQuestions,
    totalMarks,
    difficulty,
    questionType,
    includeAnswerKey = true,
    questions
  } = options;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>DocuMind AI - Question Paper (${filename})</title>
  <style>
    @page {
      size: A4;
      margin: 18mm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand {
      font-size: 22px;
      font-weight: 900;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .subbrand {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .paper-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .info-item label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .info-item span {
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 16px;
    }
    .question-card {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .q-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .q-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      flex: 1;
    }
    .q-marks {
      font-size: 11px;
      font-weight: 800;
      color: #4f46e5;
      background: #eef2ff;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
      margin-left: 12px;
      white-space: nowrap;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
      padding-left: 12px;
    }
    .opt-item {
      font-size: 12px;
      color: #334155;
    }
    .src-badge {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .page-break {
      page-break-before: always;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">DocuMind AI</div>
      <div class="subbrand">AI-Powered Document Learning & Intelligence</div>
    </div>
    <div class="doc-meta">
      <div><strong>Document:</strong> ${filename}</div>
      <div><strong>Generated:</strong> ${formattedDate}</div>
    </div>
  </div>

  <div class="paper-info">
    <div class="info-item">
      <label>Questions</label>
      <span>${numQuestions} Items</span>
    </div>
    <div class="info-item">
      <label>Total Marks</label>
      <span>${totalMarks} Marks</span>
    </div>
    <div class="info-item">
      <label>Difficulty</label>
      <span>${difficulty}</span>
    </div>
    <div class="info-item">
      <label>Type</label>
      <span>${questionType}</span>
    </div>
  </div>

  <div class="section-title">Question Paper</div>

  <div class="questions-list">
    ${questions.map((q, idx) => `
      <div class="question-card">
        <div class="q-header">
          <div class="q-title">Q${idx + 1}. ${q.question}</div>
          <div class="q-marks">${q.marks || 5} Marks</div>
        </div>
        ${q.options && q.options.length > 0 ? `
          <div class="options-grid">
            ${q.options.map((opt: string) => `<div class="opt-item">${opt}</div>`).join('')}
          </div>
        ` : ''}
        <div class="src-badge">Source: Page ${q.page || 1}</div>
      </div>
    `).join('')}
  </div>

  ${includeAnswerKey ? `
    <div class="page-break"></div>
    <div class="header" style="margin-top: 20px;">
      <div>
        <div class="brand">DocuMind AI — Answer Key</div>
        <div class="subbrand">Confidential Model Answers & Solution Key</div>
      </div>
      <div class="doc-meta">
        <div><strong>Document:</strong> ${filename}</div>
      </div>
    </div>

    <div class="section-title">Model Answers & Solutions</div>

    <div class="answers-list">
      ${questions.map((q, idx) => `
        <div class="question-card" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b;">
            Q${idx + 1}. ${q.question}
          </div>
          ${q.correct_answer !== undefined ? `
            <div style="font-size: 12px; font-weight: 700; color: #059669; margin-top: 4px;">
              Correct Answer: Option ${q.correct_answer}
            </div>
          ` : ''}
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            <strong>Model Answer / Solution:</strong> ${q.model_answer || q.explanation || 'Refer to document text for complete elaboration.'}
          </div>
        </div>
      `).join('')}
    </div>
  ` : ''}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
