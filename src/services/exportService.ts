import { jsPDF } from 'jspdf';
import { ACHE_DOMAINS, PASSING_BENCHMARK, DomainMetadata } from '../components/ProgressAnalytics';

export interface ExportDataOptions {
  candidateName?: string;
  candidateEmail?: string;
  targetDate?: string;
  domainScores: Record<string, number>;
  overallScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  includeStudyChecklist?: boolean;
  includeScorecard?: boolean;
  includeStoredInsights?: boolean;
}

export interface DomainAnalysis {
  domain: DomainMetadata;
  score: number;
  gap: number;
  status: 'exemplary' | 'proficient' | 'borderline' | 'needs_focus';
  isProficient: boolean;
  priorityDeficit: number;
}

// Helper to compute structured domain analysis
export function computeDomainAnalysis(domainScores: Record<string, number> = {}): {
  analyses: DomainAnalysis[];
  compositeScore: number;
  strengthsList: DomainAnalysis[];
  weaknessesList: DomainAnalysis[];
  top3Weaknesses: DomainAnalysis[];
  top3Strengths: DomainAnalysis[];
  isPassingOverall: boolean;
} {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  const analyses: DomainAnalysis[] = ACHE_DOMAINS.map((domain) => {
    const raw = domainScores[domain.key];
    const score = typeof raw === 'number' && !isNaN(raw) ? Number(raw) : 0;
    const gap = Number((score - PASSING_BENCHMARK).toFixed(2));
    const deficit = Math.max(0, PASSING_BENCHMARK - score);
    const priorityDeficit = deficit * (domain.weight / 100);

    totalWeightedScore += score * (domain.weight / 100);
    totalWeight += domain.weight / 100;

    let status: 'exemplary' | 'proficient' | 'borderline' | 'needs_focus' = 'needs_focus';
    if (score >= 4.5) status = 'exemplary';
    else if (score >= PASSING_BENCHMARK) status = 'proficient';
    else if (score >= 3.0) status = 'borderline';
    else status = 'needs_focus';

    return {
      domain,
      score,
      gap,
      status,
      isProficient: score >= PASSING_BENCHMARK,
      priorityDeficit
    };
  });

  const compositeScore = totalWeight > 0 ? Number((totalWeightedScore / totalWeight).toFixed(2)) : 0;

  // Strengths: sorted by highest score, then weight
  const strengthsList = [...analyses]
    .filter((a) => a.score >= PASSING_BENCHMARK)
    .sort((a, b) => b.score - a.score || b.domain.weight - a.domain.weight);

  // Weaknesses: sorted by priorityDeficit (gap * weight), then lowest score
  const weaknessesList = [...analyses]
    .filter((a) => a.score < PASSING_BENCHMARK)
    .sort((a, b) => b.priorityDeficit - a.priorityDeficit || a.score - b.score);

  // Fallbacks if user hasn't assessed or all are above/below
  const sortedByScoreDesc = [...analyses].sort((a, b) => b.score - a.score);
  const sortedByScoreAsc = [...analyses].sort((a, b) => a.score - b.score);

  const top3Strengths = strengthsList.length >= 3 ? strengthsList.slice(0, 3) : sortedByScoreDesc.slice(0, 3);
  const top3Weaknesses = weaknessesList.length >= 3 ? weaknessesList.slice(0, 3) : sortedByScoreAsc.slice(0, 3);

  return {
    analyses,
    compositeScore,
    strengthsList,
    weaknessesList,
    top3Weaknesses,
    top3Strengths,
    isPassingOverall: compositeScore >= PASSING_BENCHMARK
  };
}

// Generate ASCII progress bar
function getAsciiBar(score: number, max: number = 5, length: number = 10): string {
  const ratio = Math.max(0, Math.min(1, score / max));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Generate formatted Plain Text (.txt) summary
 */
export function generateSummaryText(options: ExportDataOptions): string {
  const {
    candidateName = 'Healthcare Executive Candidate',
    candidateEmail = '',
    targetDate,
    domainScores,
    overallScore,
    strengths = [],
    weaknesses = [],
    includeStudyChecklist = true,
    includeScorecard = true,
    includeStoredInsights = true
  } = options;

  const analysis = computeDomainAnalysis(domainScores);
  const displayComposite = overallScore ?? analysis.compositeScore;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);

  let out = '';
  out += `${divider}\n`;
  out += `  AMERICAN COLLEGE OF HEALTHCARE EXECUTIVES (ACHE)\n`;
  out += `  BOARD OF GOVERNORS EXAM - OFFLINE DOMAIN STRENGTHS & WEAKNESSES REVIEW\n`;
  out += `${divider}\n\n`;

  out += `CANDIDATE INFORMATION & BENCHMARK STATUS\n`;
  out += `${subDivider}\n`;
  out += `Candidate Name    : ${candidateName}\n`;
  if (candidateEmail) {
    out += `Candidate Email   : ${candidateEmail}\n`;
  }
  out += `Report Generated  : ${dateStr}\n`;
  if (targetDate) {
    out += `Target Exam Date  : ${targetDate}\n`;
  }
  out += `Composite Score   : ${displayComposite.toFixed(2)} / 5.00 (${Math.round((displayComposite / 5) * 100)}% Proficiency)\n`;
  out += `Passing Benchmark : ${PASSING_BENCHMARK.toFixed(2)} / 5.00 (76% Competency Standard)\n`;
  out += `Exam Readiness    : ${
    displayComposite >= PASSING_BENCHMARK
      ? 'PASSING BENCHMARK ACHIEVED (Maintain retention across domains)'
      : 'TARGETED REMEDIATION REQUIRED (Focus on priority deficit domains)'
  }\n\n`;

  // SECTION 1: PRIMARY STRENGTHS
  out += `1. DOMAIN-SPECIFIC STRENGTHS & HIGH COMPETENCIES\n`;
  out += `${subDivider}\n`;
  if (analysis.strengthsList.length > 0) {
    analysis.strengthsList.forEach((item, idx) => {
      out += `[STRENGTH ${idx + 1}] ${item.domain.title.toUpperCase()} (Exam Weight: ${item.domain.weight}%)\n`;
      out += `  Score        : ${item.score.toFixed(1)} / 5.0  [${getAsciiBar(item.score)}] (+${item.gap > 0 ? item.gap : 0} above benchmark)\n`;
      out += `  Status       : ${item.status === 'exemplary' ? 'Exemplary Mastery' : 'Proficient Passing'}\n`;
      out += `  Description  : ${item.domain.description}\n`;
      out += `  Core Topics  : ${item.domain.keyTopics.join(', ')}\n\n`;
    });
  } else {
    out += `  Currently evaluating baseline data. Domains with highest initial scores:\n`;
    analysis.top3Strengths.forEach((item, idx) => {
      out += `  ${idx + 1}. ${item.domain.title}: ${item.score.toFixed(1)} / 5.0 (${item.domain.weight}% weight)\n`;
    });
    out += `\n`;
  }

  // Stored AI Assessment Strengths
  if (includeStoredInsights && strengths.length > 0) {
    out += `AI Clinical & Leadership Diagnostic Insights (Strengths):\n`;
    strengths.forEach((str) => {
      out += `  • ${str}\n`;
    });
    out += `\n`;
  }

  // SECTION 2: KEY WEAKNESSES & REMEDIATION
  out += `2. KEY WEAKNESSES & PRIORITY REMEDIATION DOMAINS\n`;
  out += `${subDivider}\n`;
  if (analysis.weaknessesList.length > 0) {
    analysis.weaknessesList.forEach((item, idx) => {
      const deficit = (PASSING_BENCHMARK - item.score).toFixed(1);
      out += `[PRIORITY FOCUS ${idx + 1}] ${item.domain.title.toUpperCase()} (Exam Weight: ${item.domain.weight}%)\n`;
      out += `  Score        : ${item.score.toFixed(1)} / 5.0  [${getAsciiBar(item.score)}] (-${deficit} below passing threshold)\n`;
      out += `  Priority Rank: ${idx === 0 ? 'HIGHEST LEVERAGE (Immediate Study Priority)' : 'Secondary Focus'}\n`;
      out += `  Why It Matters: Accounting for ${item.domain.weight}% of the exam, improving this domain yields maximum score gains.\n`;
      out += `  High-Yield Remediation Topics to Master:\n`;
      item.domain.keyTopics.forEach((topic) => {
        out += `    - [ ] ${topic}\n`;
      });
      out += `\n`;
    });
  } else {
    out += `  All domains currently meet the passing benchmark! Focus on maintaining retention.\n\n`;
  }

  // Stored AI Assessment Weaknesses
  if (includeStoredInsights && weaknesses.length > 0) {
    out += `AI Diagnostic Identified Remediation Targets:\n`;
    weaknesses.forEach((wk) => {
      out += `  ▲ ${wk}\n`;
    });
    out += `\n`;
  }

  // SECTION 3: FULL 10-DOMAIN SCORECARD
  if (includeScorecard) {
    out += `3. COMPREHENSIVE 10-DOMAIN ACHE SCORECARD\n`;
    out += `${subDivider}\n`;
    out += `Domain Name                  Weight  Score  Target  Status        Progress\n`;
    out += `${'-'.repeat(27)}  ------  -----  ------  ------------  ----------\n`;
    analysis.analyses.forEach((item) => {
      const namePadded = item.domain.title.padEnd(27, ' ').slice(0, 27);
      const weightPadded = `${item.domain.weight}%`.padStart(5, ' ');
      const scorePadded = `${item.score.toFixed(1)}/5`.padStart(6, ' ');
      const targetPadded = `3.8/5`.padStart(6, ' ');
      let statusLabel = 'Needs Focus ';
      if (item.score >= 4.5) statusLabel = 'Exemplary   ';
      else if (item.score >= PASSING_BENCHMARK) statusLabel = 'Proficient  ';
      else if (item.score >= 3.0) statusLabel = 'Borderline  ';

      out += `${namePadded}  ${weightPadded}  ${scorePadded}  ${targetPadded}  ${statusLabel}  [${getAsciiBar(item.score)}]\n`;
    });
    out += `\n`;
  }

  // SECTION 4: OFFLINE STUDY CHECKLIST & PROMPTS
  if (includeStudyChecklist) {
    out += `4. OFFLINE HIGH-YIELD STUDY PROMPTS & DRILLS\n`;
    out += `${subDivider}\n`;
    out += `Use these self-quizzing prompts offline without internet access:\n\n`;

    analysis.top3Weaknesses.forEach((item) => {
      out += `[${item.domain.title.toUpperCase()} - SELF-QUIZ DRILL]\n`;
      item.domain.keyTopics.forEach((topic, i) => {
        out += `  Q${i + 1}: Explain how an executive navigates "${topic}" in a healthcare system crisis.\n`;
        out += `     Self-assessment checklist:\n`;
        out += `     [ ] Key regulatory/statutory frameworks cited\n`;
        out += `     [ ] Governance, medical staff, or board communication addressed\n`;
        out += `     [ ] Financial or operational sustainability balanced with patient safety\n\n`;
      });
    });

    out += `EXECUTIVE STUDY LOG & NOTES\n`;
    out += `Date: ____________   Domain Reviewed: _____________________________\n`;
    out += `Hours Studied: _____ Flashcards Completed: _____ Questions Solved: _____\n`;
    out += `Key Insight Mastered Today:\n`;
    out += `_____________________________________________________________________________\n`;
    out += `_____________________________________________________________________________\n\n`;
  }

  out += `${divider}\n`;
  out += `END OF OFFLINE SUMMARY - ACHE Board of Governors Examination Prep\n`;
  out += `${divider}\n`;

  return out;
}

/**
 * Generate formatted Markdown (.md) summary
 */
export function generateSummaryMarkdown(options: ExportDataOptions): string {
  const {
    candidateName = 'Healthcare Executive Candidate',
    candidateEmail = '',
    targetDate,
    domainScores,
    overallScore,
    strengths = [],
    weaknesses = [],
    includeStudyChecklist = true,
    includeScorecard = true,
    includeStoredInsights = true
  } = options;

  const analysis = computeDomainAnalysis(domainScores);
  const displayComposite = overallScore ?? analysis.compositeScore;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let md = '';
  md += `# ACHE Board of Governors Exam — Strengths & Weaknesses Summary\n\n`;
  md += `**Candidate:** ${candidateName} ${candidateEmail ? `(${candidateEmail})` : ''}  \n`;
  md += `**Generated:** ${dateStr}  \n`;
  if (targetDate) md += `**Target Exam Date:** ${targetDate}  \n`;
  md += `**Overall Composite Score:** \`${displayComposite.toFixed(2)} / 5.00\` (${Math.round((displayComposite / 5) * 100)}%)  \n`;
  md += `**Passing Benchmark:** \`3.80 / 5.00\`  \n`;
  md += `**Readiness Status:** ${
    displayComposite >= PASSING_BENCHMARK
      ? '🟢 **PASSING BENCHMARK ACHIEVED**'
      : '🟡 **TARGETED REMEDIATION REQUIRED**'
  }\n\n`;

  md += `---\n\n`;

  // SECTION 1: STRENGTHS
  md += `## 1. Domain Strengths & Core Competencies\n\n`;
  if (analysis.strengthsList.length > 0) {
    analysis.strengthsList.forEach((item) => {
      md += `### 🌟 ${item.domain.title} (${item.score.toFixed(1)}/5.00 • ${item.domain.weight}% Exam Weight)\n`;
      md += `> ${item.domain.description}\n\n`;
      md += `- **Mastery Level:** ${item.status === 'exemplary' ? 'Exemplary Mastery (Top Tier)' : 'Proficient (Passing)'}\n`;
      md += `- **Benchmark Advantage:** +${(item.score - PASSING_BENCHMARK).toFixed(1)} above minimum threshold\n`;
      md += `- **Key Knowledge Assets:** ${item.domain.keyTopics.join(', ')}\n\n`;
    });
  } else {
    md += `*Baseline diagnostic in progress. Currently top-scoring domains:*  \n`;
    analysis.top3Strengths.forEach((item) => {
      md += `- **${item.domain.title}**: ${item.score.toFixed(1)}/5.00 (${item.domain.weight}% weight)\n`;
    });
    md += `\n`;
  }

  if (includeStoredInsights && strengths.length > 0) {
    md += `#### AI Diagnostic Stored Strengths:\n`;
    strengths.forEach((s) => {
      md += `- ✅ ${s}\n`;
    });
    md += `\n`;
  }

  // SECTION 2: WEAKNESSES
  md += `## 2. Priority Weaknesses & High-Yield Remediation Areas\n\n`;
  if (analysis.weaknessesList.length > 0) {
    analysis.weaknessesList.forEach((item, idx) => {
      const deficit = (PASSING_BENCHMARK - item.score).toFixed(1);
      md += `### ⚠️ Focus Area ${idx + 1}: ${item.domain.title} (${item.score.toFixed(1)}/5.00 • ${item.domain.weight}% Exam Weight)\n`;
      md += `> **Deficit:** -${deficit} below passing threshold. **Weighted Priority Impact:** ${(item.priorityDeficit * 100).toFixed(1)} index points.\n\n`;
      md += `**Topics to master offline:**\n`;
      item.domain.keyTopics.forEach((t) => {
        md += `- [ ] **${t}**\n`;
      });
      md += `\n`;
    });
  } else {
    md += `*All domains currently meet or exceed the 3.8/5.0 benchmark! Keep practicing to maintain memory retention.*\n\n`;
  }

  if (includeStoredInsights && weaknesses.length > 0) {
    md += `#### AI Diagnostic Remediation Focus Points:\n`;
    weaknesses.forEach((w) => {
      md += `- ⚠️ ${w}\n`;
    });
    md += `\n`;
  }

  // SECTION 3: 10-DOMAIN SCORECARD TABLE
  if (includeScorecard) {
    md += `## 3. Official 10-Domain Competency Scorecard\n\n`;
    md += `| Domain | Exam Weight | Score | Target | Gap | Status |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
    analysis.analyses.forEach((item) => {
      const gapStr = item.gap >= 0 ? `+${item.gap}` : `${item.gap}`;
      let statusEmoji = '🔴 Needs Review';
      if (item.score >= 4.5) statusEmoji = '🟢 Exemplary';
      else if (item.score >= PASSING_BENCHMARK) statusEmoji = '🟢 Proficient';
      else if (item.score >= 3.0) statusEmoji = '🟡 Borderline';

      md += `| **${item.domain.title}** | ${item.domain.weight}% | ${item.score.toFixed(1)} / 5 | 3.8 / 5 | ${gapStr} | ${statusEmoji} |\n`;
    });
    md += `\n`;
  }

  // SECTION 4: OFFLINE DRILLS
  if (includeStudyChecklist) {
    md += `## 4. Offline High-Yield Study Questions\n\n`;
    analysis.top3Weaknesses.forEach((item) => {
      md += `### 📝 ${item.domain.title} Practice Scenarios\n\n`;
      item.domain.keyTopics.forEach((topic, i) => {
        md += `**Scenario ${i + 1}:** You are the COO/CEO. Describe your executive action plan for **${topic}**.\n`;
        md += `- [ ] Cite key governance and board implications.\n`;
        md += `- [ ] Detail regulatory and financial compliance risks.\n`;
        md += `- [ ] Specify communication protocol for clinical leadership and community stakeholders.\n\n`;
      });
    });
  }

  return md;
}

/**
 * Generate formatted executive PDF report (.pdf) using jsPDF
 */
export function generateSummaryPdf(options: ExportDataOptions): jsPDF {
  const {
    candidateName = 'Healthcare Executive Candidate',
    candidateEmail = '',
    targetDate,
    domainScores,
    overallScore,
    strengths = [],
    weaknesses = [],
    includeStudyChecklist = true,
    includeScorecard = true,
    includeStoredInsights = true
  } = options;

  const analysis = computeDomainAnalysis(domainScores);
  const displayComposite = overallScore ?? analysis.compositeScore;
  const isPassing = displayComposite >= PASSING_BENCHMARK;
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add page breaks smoothly
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    // Top tiny rule
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(margin, margin - 4, pageWidth - margin, margin - 4);

    // Bottom footer
    const footerY = pageHeight - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('ACHE Board of Governors Examination Prep • Offline Executive Review', margin, footerY);
    const pageNum = doc.getNumberOfPages();
    doc.text(`Page ${pageNum}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // --- PAGE 1: HEADER & EXECUTIVE KPI SUMMARY ---
  // Top Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ACHE BOARD OF GOVERNORS EXAM', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Offline Domain Strengths & Weaknesses Executive Diagnostic Summary', margin + 6, y + 16);

  // Status Badge in header
  if (isPassing) {
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(pageWidth - margin - 46, y + 5, 40, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PASSING BENCHMARK', pageWidth - margin - 26, y + 10, { align: 'center' });
  } else {
    doc.setFillColor(245, 158, 11); // amber-500
    doc.roundedRect(pageWidth - margin - 46, y + 5, 40, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TARGETED REVIEW', pageWidth - margin - 26, y + 10, { align: 'center' });
  }

  y += 31;

  // Candidate Details strip
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Candidate: ${candidateName}${candidateEmail ? ` (${candidateEmail})` : ''}`, margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const metaRight = `Date: ${dateStr}${targetDate ? `  |  Target Exam: ${targetDate}` : ''}`;
  doc.text(metaRight, pageWidth - margin - 5, y + 6, { align: 'right' });

  doc.text(
    `Benchmark Threshold: 3.80 / 5.00 (76% Passing)   |   Calculated Overall: ${displayComposite.toFixed(2)} / 5.00 (${Math.round((displayComposite / 5) * 100)}%)`,
    margin + 5,
    y + 11
  );

  y += 19;

  // 4 KPI Summary Cards
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 20;

  // Card 1: Composite Score
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('COMPOSITE SCORE', margin + 4, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(`${displayComposite.toFixed(2)}`, margin + 4, y + 13);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`/ 5.00 (${Math.round((displayComposite / 5) * 100)}%)`, margin + 18, y + 13);
  doc.text(isPassing ? 'Meets threshold' : 'Below benchmark', margin + 4, y + 18);

  // Card 2: Passing Benchmark
  const c2X = margin + cardWidth + cardGap;
  doc.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PASS BENCHMARK', c2X + 4, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text('3.80', c2X + 4, y + 13);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('/ 5.00', c2X + 16, y + 13);
  doc.text('76% Competency Standard', c2X + 4, y + 18);

  // Card 3: Top Strength
  const c3X = c2X + cardWidth + cardGap;
  doc.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PEAK DOMAIN', c3X + 4, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(16, 185, 129); // emerald-600
  const topStrTitle = analysis.top3Strengths[0]?.domain.shortLabel || 'None';
  doc.text(topStrTitle, c3X + 4, y + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Score: ${analysis.top3Strengths[0]?.score.toFixed(1) || '0.0'}/5.0`, c3X + 4, y + 18);

  // Card 4: Top Weakness
  const c4X = c3X + cardWidth + cardGap;
  doc.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PRIORITY REMEDIATION', c4X + 4, y + 5);
  doc.setFontSize(9.5);
  doc.setTextColor(239, 68, 68); // red-500
  const topWkTitle = analysis.top3Weaknesses[0]?.domain.shortLabel || 'None';
  doc.text(topWkTitle, c4X + 4, y + 12);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Score: ${analysis.top3Weaknesses[0]?.score.toFixed(1) || '0.0'}/5.0`, c4X + 4, y + 18);

  y += cardHeight + 7;

  // --- SECTION: PRIMARY STRENGTHS ---
  checkPageBreak(35);
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('PRIMARY DOMAIN STRENGTHS (EXCEEDING BENCHMARK)', margin + 4, y + 5);
  y += 10;

  analysis.top3Strengths.forEach((item, i) => {
    checkPageBreak(18);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');

    // Title & Score
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`${i + 1}. ${item.domain.title}`, margin + 4, y + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`Score: ${item.score.toFixed(1)} / 5.0   [${item.domain.weight}% Exam Weight]`, pageWidth - margin - 4, y + 5, {
      align: 'right'
    });

    // Sub topics
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Mastered Competencies: ${item.domain.keyTopics.join(' • ')}`, margin + 4, y + 10);

    y += 16;
  });

  // Stored AI Diagnostic Strengths
  if (includeStoredInsights && strengths.length > 0) {
    checkPageBreak(15 + strengths.length * 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text('Diagnostic Assessment Notes (Observed Strengths):', margin + 2, y + 3);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    strengths.slice(0, 3).forEach((s) => {
      const splitLines = doc.splitTextToSize(`• ${s}`, contentWidth - 6);
      doc.text(splitLines, margin + 4, y);
      y += splitLines.length * 3.8;
    });
    y += 2;
  }

  // --- SECTION: PRIORITY WEAKNESSES & REMEDIATION ---
  checkPageBreak(35);
  y += 2;
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202); // red-200
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // red-800
  doc.text('PRIORITY WEAKNESSES & REMEDIATION FOCUS AREAS', margin + 4, y + 5);
  y += 10;

  analysis.top3Weaknesses.forEach((item, i) => {
    checkPageBreak(22);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'FD');

    // Title & Deficit
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(`${i + 1}. ${item.domain.title}`, margin + 4, y + 5);

    const deficit = Math.max(0, PASSING_BENCHMARK - item.score).toFixed(1);
    doc.setFontSize(8.5);
    doc.text(`Score: ${item.score.toFixed(1)} / 5.0 (Deficit: -${deficit})  [${item.domain.weight}% Weight]`, pageWidth - margin - 4, y + 5, {
      align: 'right'
    });

    // High Yield study guidance
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`High-Yield Study Topics to Review:`, margin + 4, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(item.domain.keyTopics.join('  |  '), margin + 4, y + 14);

    y += 21;
  });

  // Stored AI Diagnostic Weaknesses
  if (includeStoredInsights && weaknesses.length > 0) {
    checkPageBreak(15 + weaknesses.length * 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('Diagnostic Assessment Notes (Remediation Needed):', margin + 2, y + 3);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    weaknesses.slice(0, 3).forEach((w) => {
      const splitLines = doc.splitTextToSize(`▲ ${w}`, contentWidth - 6);
      doc.text(splitLines, margin + 4, y);
      y += splitLines.length * 3.8;
    });
    y += 2;
  }

  // --- SECTION: COMPLETE 10-DOMAIN SCORECARD TABLE ---
  if (includeScorecard) {
    checkPageBreak(65);
    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL 10-DOMAIN ACHE COMPETENCY SCORECARD', margin + 4, y + 5);
    y += 9;

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('DOMAIN NAME', margin + 3, y + 4);
    doc.text('WEIGHT', margin + 65, y + 4, { align: 'center' });
    doc.text('CANDIDATE', margin + 92, y + 4, { align: 'center' });
    doc.text('BENCHMARK', margin + 120, y + 4, { align: 'center' });
    doc.text('STATUS', pageWidth - margin - 5, y + 4, { align: 'right' });
    y += 6;

    analysis.analyses.forEach((item, idx) => {
      checkPageBreak(6.5);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(item.domain.title, margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${item.domain.weight}%`, margin + 65, y + 4, { align: 'center' });

      // Score
      doc.setFont('helvetica', 'bold');
      if (item.score >= PASSING_BENCHMARK) {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(`${item.score.toFixed(1)} / 5.0`, margin + 92, y + 4, { align: 'center' });

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('3.80 / 5.0', margin + 120, y + 4, { align: 'center' });

      // Status text
      doc.setFont('helvetica', 'bold');
      if (item.score >= 4.5) {
        doc.setTextColor(16, 185, 129);
        doc.text('EXEMPLARY', pageWidth - margin - 5, y + 4, { align: 'right' });
      } else if (item.score >= PASSING_BENCHMARK) {
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text('PROFICIENT', pageWidth - margin - 5, y + 4, { align: 'right' });
      } else if (item.score >= 3.0) {
        doc.setTextColor(245, 158, 11);
        doc.text('BORDERLINE', pageWidth - margin - 5, y + 4, { align: 'right' });
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text('NEEDS FOCUS', pageWidth - margin - 5, y + 4, { align: 'right' });
      }

      y += 5.5;
    });

    y += 4;
  }

  // --- SECTION: OFFLINE STUDY DRILLS & CHECKLIST ---
  if (includeStudyChecklist) {
    checkPageBreak(50);
    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text('OFFLINE HIGH-YIELD PRACTICE SCENARIOS & STUDY CHECKLIST', margin + 4, y + 5);
    y += 10;

    analysis.top3Weaknesses.slice(0, 2).forEach((item) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`High-Yield Questions: ${item.domain.title}`, margin + 3, y);
      y += 4.5;

      item.domain.keyTopics.slice(0, 3).forEach((topic) => {
        checkPageBreak(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`[  ] Scenario: How should an executive resolve regulatory and clinical conflicts in "${topic}"?`, margin + 5, y);
        y += 4;
      });
      y += 2;
    });

    // Offline Study Log Box
    checkPageBreak(22);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFLINE EXECUTIVE STUDY LOG', margin + 4, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Date: ______________   Domain Studied: _______________________   Hours: _____   Flashcards: _____', margin + 4, y + 9);
    doc.text('Key Strategic Takeaway Mastered: __________________________________________________________________', margin + 4, y + 14);

    y += 22;
  }

  // Draw headers/footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ACHE Board of Governors Examination Prep • Offline Executive Diagnostic Review', margin, footerY);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  return doc;
}

/**
 * Trigger file download helper in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
