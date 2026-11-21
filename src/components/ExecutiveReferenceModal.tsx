import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  DollarSign,
  ShieldCheck,
  Building2,
  Award,
  BookOpen,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

export type ReferenceCategory = 'all' | 'finance' | 'laws' | 'governance' | 'quality';

export interface ReferenceEntry {
  id: string;
  category: Exclude<ReferenceCategory, 'all'>;
  title: string;
  formulaOrStatute: string;
  benchmarkOrRule: string;
  executiveApplication: string;
  tags: string[];
}

export const EXECUTIVE_REFERENCE_ITEMS: ReferenceEntry[] = [
  // ==================== FINANCE FORMULAS ====================
  {
    id: 'fin-operating-margin',
    category: 'finance',
    title: 'Operating Margin',
    formulaOrStatute: '(Operating Revenue - Operating Expenses) / Operating Revenue',
    benchmarkOrRule: 'Target Benchmark: 2.5% – 4.5% for non-profit health systems',
    executiveApplication:
      'Measures core hospital operational profitability excluding non-operating investment income or philanthropy. Essential for evaluating core clinical service line sustainability.',
    tags: ['profitability', 'income statement', 'margin', 'operations']
  },
  {
    id: 'fin-total-margin',
    category: 'finance',
    title: 'Total Margin (Excess Margin)',
    formulaOrStatute: 'Net Income (Excess of Revenues over Expenses) / Total Revenue',
    benchmarkOrRule: 'Target Benchmark: 4.0% – 6.0%',
    executiveApplication:
      'Includes both operating income and non-operating income (endowments, investments, donations). Watch for positive Total Margin masking a negative Operating Margin.',
    tags: ['profitability', 'net income', 'investments']
  },
  {
    id: 'fin-days-cash-on-hand',
    category: 'finance',
    title: 'Days Cash on Hand',
    formulaOrStatute:
      '(Cash + Marketable Securities + Unrestricted Investments) / [(Operating Expenses - Depreciation) / 365]',
    benchmarkOrRule: 'Target Benchmark: 150 – 250+ days for A/AA bond ratings',
    executiveApplication:
      'Primary liquidity metric closely watched by municipal bond rating agencies (Moody’s, S&P, Fitch). Depreciation is subtracted from daily expense because it is a non-cash expense.',
    tags: ['liquidity', 'bond rating', 'cash', 'depreciation']
  },
  {
    id: 'fin-days-in-ar',
    category: 'finance',
    title: 'Days in Accounts Receivable (Net A/R Days)',
    formulaOrStatute: 'Net Patient Accounts Receivable / (Net Patient Service Revenue / 365)',
    benchmarkOrRule: 'Target Benchmark: < 40 – 45 days',
    executiveApplication:
      'Evaluates Revenue Cycle Management (RCM) collection velocity. Rising A/R days signal claim denials, coding bottlenecks, or payer processing delays.',
    tags: ['revenue cycle', 'receivables', 'liquidity', 'RCM']
  },
  {
    id: 'fin-current-ratio',
    category: 'finance',
    title: 'Current Ratio & Acid-Test (Quick) Ratio',
    formulaOrStatute:
      'Current Ratio = Current Assets / Current Liabilities | Quick Ratio = (Cash + Marketable Securities + Net A/R) / Current Liabilities',
    benchmarkOrRule: 'Current Ratio ≥ 2.0x | Quick Ratio ≥ 1.2x',
    executiveApplication:
      'Measures short-term solvency over the next 12 months. The Quick Ratio excludes inventory (medical supplies/pharmacy) to test immediate liquidity.',
    tags: ['liquidity', 'solvency', 'balance sheet']
  },
  {
    id: 'fin-dscr',
    category: 'finance',
    title: 'Debt Service Coverage Ratio (DSCR)',
    formulaOrStatute:
      '(Net Income + Interest Expense + Depreciation & Amortization) / (Principal Payments + Interest Expense)',
    benchmarkOrRule: 'Bond Covenant Minimum: ≥ 1.20x | Strong Rating: ≥ 3.0x',
    executiveApplication:
      'Most critical debt covenant ratio in healthcare tax-exempt revenue bonds. Dropping below the covenant threshold (typically 1.1x–1.25x) can trigger technical default.',
    tags: ['capital structure', 'bonds', 'debt covenant', 'EBIDA']
  },
  {
    id: 'fin-debt-to-cap',
    category: 'finance',
    title: 'Long-Term Debt to Capitalization',
    formulaOrStatute: 'Long-Term Debt / (Long-Term Debt + Net Assets / Equity)',
    benchmarkOrRule: 'Target Benchmark: < 35% – 40%',
    executiveApplication:
      'Evaluates capital structure leverage and remaining debt capacity before issuing bonds for major facility construction or IT investments.',
    tags: ['leverage', 'capital structure', 'bonds', 'net assets']
  },
  {
    id: 'fin-breakeven-volume',
    category: 'finance',
    title: 'Contribution Margin & Breakeven Volume',
    formulaOrStatute:
      'Contribution Margin per Unit = Price - Variable Cost per Unit | Breakeven Volume = Total Fixed Costs / (Price - Variable Cost per Unit)',
    benchmarkOrRule: 'Include Target Profit in numerator: (Fixed Costs + Target Profit) / CM',
    executiveApplication:
      'Used in service-line pro formas and equipment acquisition analysis. In capitated contracts, revenue is fixed and volume is a cost driver (inverted breakeven).',
    tags: ['cost accounting', 'breakeven', 'fixed cost', 'variable cost']
  },
  {
    id: 'fin-npv-irr',
    category: 'finance',
    title: 'Net Present Value (NPV) & Internal Rate of Return (IRR)',
    formulaOrStatute:
      'NPV = Σ [CF_t / (1 + r)^t] - Initial Outlay | IRR = Discount rate r where NPV = 0',
    benchmarkOrRule: 'Accept when NPV > $0 and IRR > Cost of Capital (Hurdle Rate)',
    executiveApplication:
      'NPV is preferred over IRR for mutually exclusive capital projects because NPV assumes reinvestment at the cost of capital, whereas IRR assumes reinvestment at the IRR.',
    tags: ['capital budgeting', 'NPV', 'IRR', 'discount rate']
  },
  {
    id: 'fin-cmi-capitation',
    category: 'finance',
    title: 'Case Mix Index (CMI) & Capitation PMPM',
    formulaOrStatute:
      'CMI = Σ (MS-DRG Relative Weights) / Total Discharges | Capitation Pool = Covered Lives × PMPM Rate',
    benchmarkOrRule: 'Higher CMI = higher clinical acuity & DRG reimbursement',
    executiveApplication:
      'CMI reflects average resource intensity of inpatient admissions. Accurate clinical documentation improvement (CDI) prevents under-coding of comorbidities (CC/MCC).',
    tags: ['reimbursement', 'DRG', 'CMI', 'capitation', 'PMPM']
  },

  // ==================== LAWS & REGULATIONS ====================
  {
    id: 'law-stark',
    category: 'laws',
    title: 'Stark Law (Physician Self-Referral Law - 42 U.S.C. § 1395nn)',
    formulaOrStatute:
      'Strict Liability Civil Statute: Prohibits physician referrals of Designated Health Services (DHS) payable by Medicare/Medicaid to entities with which the physician (or immediate family) has a financial relationship.',
    benchmarkOrRule: 'No intent required (Strict Liability). Must fit 100% within a Statutory Exception.',
    executiveApplication:
      'Exceptions include bona fide employment, fair market value (FMV) personal services contracts (set in advance, not tied to volume/value of referrals), and in-office ancillary services.',
    tags: ['Stark', 'strict liability', 'DHS', 'physician compensation', 'FMV']
  },
  {
    id: 'law-aks',
    category: 'laws',
    title: 'Anti-Kickback Statute (AKS - 42 U.S.C. § 1320a-7b(b))',
    formulaOrStatute:
      'Intent-Based Criminal & Civil Statute: Prohibits knowingly and willfully offering, paying, soliciting, or receiving remuneration to induce or reward referrals under federal healthcare programs.',
    benchmarkOrRule: 'Intent required ("One Purpose" Test). Voluntary Safe Harbors protect compliant arrangements.',
    executiveApplication:
      'Unlike Stark (physicians + civil only), AKS applies to ANY person/entity and carries felony criminal penalties, treble damages, and Medicare exclusion.',
    tags: ['AKS', 'kickback', 'safe harbor', 'criminal', 'remuneration']
  },
  {
    id: 'law-emtala',
    category: 'laws',
    title: 'EMTALA (Emergency Medical Treatment & Labor Act)',
    formulaOrStatute:
      'Requires Medicare-participating hospitals with dedicated EDs to provide: (1) an appropriate Medical Screening Examination (MSE) to anyone presenting within 250 yards, (2) stabilization of emergency medical conditions/active labor, and (3) appropriate transfer if capacity is exceeded.',
    benchmarkOrRule: 'Cannot delay MSE to inquire about insurance or payment status.',
    executiveApplication:
      'Receiving hospitals with specialized capabilities (e.g., burn unit, NICU) have a "reverse-dumping" obligation to accept appropriate transfers if they have capacity.',
    tags: ['EMTALA', 'emergency department', 'MSE', 'transfer', '250 yards']
  },
  {
    id: 'law-fca',
    category: 'laws',
    title: 'False Claims Act (FCA - 31 U.S.C. §§ 3729–3733)',
    formulaOrStatute:
      'Imposes civil liability for knowingly submitting (or causing to be submitted) false or fraudulent claims to federal payers. "Knowing" includes actual knowledge, deliberate ignorance, or reckless disregard.',
    benchmarkOrRule: 'Qui Tam whistleblower provisions allow relators to receive 15%–30% of recovered funds.',
    executiveApplication:
      'Includes the 60-Day Overpayment Rule: once a hospital identifies a Medicare/Medicaid overpayment, failure to report and return it within 60 days becomes a Reverse False Claim.',
    tags: ['FCA', 'qui tam', 'whistleblower', 'upcoding', '60-day rule']
  },
  {
    id: 'law-hipaa-nlra',
    category: 'laws',
    title: 'HIPAA Breach Notification & NLRA Bargaining Units',
    formulaOrStatute:
      'HIPAA Breach Rule: Notify affected individuals, HHS OCR, and (if ≥ 500 residents of a state/jurisdiction) prominent media without unreasonable delay and no later than 60 calendar days after discovery.',
    benchmarkOrRule: 'NLRA Acute Care Hospital Rule: Maximum of 8 defined collective bargaining units.',
    executiveApplication:
      'For NLRA labor strikes, unions in healthcare institutions must provide a mandatory 10-day written notice (Section 8(g)) prior to any strike or picketing to ensure patient continuity of care.',
    tags: ['HIPAA', 'breach', '500 individuals', 'NLRA', '10-day strike notice', '8 bargaining units']
  },

  // ==================== GOVERNANCE ====================
  {
    id: 'gov-fiduciary-duties',
    category: 'governance',
    title: 'Governing Board Fiduciary Duties (Care, Loyalty, Obedience)',
    formulaOrStatute:
      'Duty of Care: Informed, prudent decision-making (Business Judgment Rule) | Duty of Loyalty: Undivided allegiance, disclosure & recusal on Conflicts of Interest | Duty of Obedience: Fidelity to organizational mission, bylaws, and tax-exempt purpose.',
    benchmarkOrRule: 'Board sets policy & strategy; CEO executes daily operations.',
    executiveApplication:
      'When a trustee has a conflict of interest on a contract, they must disclose the conflict, answer factual questions if asked, and leave the room/abstain from final deliberation and voting.',
    tags: ['fiduciary', 'duty of care', 'duty of loyalty', 'duty of obedience', 'conflict of interest']
  },
  {
    id: 'gov-credentialing',
    category: 'governance',
    title: 'Medical Staff Credentialing, Privileging & Corporate Negligence',
    formulaOrStatute:
      'Landmark Case: Darling v. Charleston Community Memorial Hospital — established that the Governing Board holds ultimate legal accountability for patient care quality and medical staff credentialing.',
    benchmarkOrRule: 'Medical Staff Executive Committee (MEC) recommends; Governing Board grants final approval.',
    executiveApplication:
      'The Joint Conference Committee (equal board trustees + medical staff leaders + CEO) serves as the formal dispute-resolution mechanism when the Board and MEC disagree.',
    tags: ['Darling', 'credentialing', 'privileging', 'MEC', 'Joint Conference Committee']
  },

  // ==================== QUALITY & SAFETY ====================
  {
    id: 'qual-donabedian',
    category: 'quality',
    title: 'Donabedian Quality Framework (Structure, Process, Outcome)',
    formulaOrStatute:
      'Structure: Facility resources, nurse-to-patient ratios, EHR capabilities, board certification | Process: Compliance with sepsis bundles, door-to-balloon time, hand hygiene | Outcome: 30-day readmissions, CLABSI/CAUTI rates, mortality, HCAHPS.',
    benchmarkOrRule: 'Structure enables Process; Process drives Outcome.',
    executiveApplication:
      'BOG exam scenarios frequently ask you to classify a metric as Structure, Process, or Outcome. Always trace whether the metric measures capacity (Structure), clinician action (Process), or patient result (Outcome).',
    tags: ['Donabedian', 'structure', 'process', 'outcome', 'quality metrics']
  },
  {
    id: 'qual-fmea-rca-lean',
    category: 'quality',
    title: 'FMEA vs. RCA & Lean vs. Six Sigma (DMAIC)',
    formulaOrStatute:
      'FMEA (Failure Mode and Effects Analysis): Proactive risk assessment before launching a new process (RPN = Severity × Occurrence × Detection) | RCA (Root Cause Analysis): Reactive systems analysis after a sentinel event or near-miss.',
    benchmarkOrRule: 'Lean eliminates waste (Muda) & improves flow | Six Sigma reduces process variation (3.4 defects per million).',
    executiveApplication:
      'In a Just Culture, human error is consoled (and system processes redesigned), at-risk behavior (shortcuts) is coached, and reckless behavior (conscious disregard of substantial risk) is disciplined.',
    tags: ['FMEA', 'RCA', 'Lean', 'Six Sigma', 'DMAIC', 'Just Culture', 'RPN']
  }
];

interface ExecutiveReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForDeepDive?: (topicTitle: string) => void;
}

export default function ExecutiveReferenceModal({
  isOpen,
  onClose,
  onSelectForDeepDive
}: ExecutiveReferenceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ReferenceCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXECUTIVE_REFERENCE_ITEMS.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.formulaOrStatute.toLowerCase().includes(q) ||
        item.executiveApplication.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const handleCopy = (item: ReferenceEntry) => {
    const text = `${item.title}\nFormula/Rule: ${item.formulaOrStatute}\nBenchmark: ${item.benchmarkOrRule}\nExecutive Application: ${item.executiveApplication}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const categories: { id: ReferenceCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'All Reference', icon: BookOpen },
    { id: 'finance', label: 'Finance Formulas', icon: DollarSign },
    { id: 'laws', label: 'Laws & Statutes', icon: ShieldCheck },
    { id: 'governance', label: 'Governance', icon: Building2 },
    { id: 'quality', label: 'Quality & HRO', icon: Award }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                ACHE Executive Reference & Formula Sheet
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                High-yield financial ratios, healthcare statutes, fiduciary duties, and quality frameworks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search formulas, ratios, Stark, AKS, EMTALA, DSCR, Donabedian, FMEA..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No reference formulas or statutes matched "{searchQuery}".
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                        item.category === 'finance'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : item.category === 'laws'
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300'
                          : item.category === 'governance'
                          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {item.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                      title="Copy formula card"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    {onSelectForDeepDive && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectForDeepDive(item.title);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Deep Dive</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 font-mono text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 font-semibold mb-2.5">
                  {item.formulaOrStatute}
                </div>

                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                  {item.benchmarkOrRule}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.executiveApplication}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
