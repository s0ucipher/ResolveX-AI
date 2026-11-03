import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BarChart2,
  Sparkles,
  BookOpen,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { ClassifyResult } from '../types';

export const ModelEvaluationPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Live Playground State
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [testResult, setTestResult] = useState<ClassifyResult | null>(null);

  useEffect(() => {
    async function loadInfo() {
      try {
        const data = await api.getModelInfo();
        setModelInfo(data);
      } catch (err) {
        console.error('Failed to load model evaluation metrics', err);
      } finally {
        setLoading(false);
      }
    }
    loadInfo();
  }, []);

  const handleRunPlayground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim() || !testDescription.trim()) return;
    setEvaluating(true);
    try {
      const res = await api.classifyText(testTitle.trim(), testDescription.trim());
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const sampleInputs = [
    {
      title: "Sparking switchboard in computer lab",
      desc: "Smoke coming out of the main wall electrical plug near workstation 12 with loud sparking."
    },
    {
      title: "Broken washbasin faucet spraying water",
      desc: "High pressure tap in 2nd floor restroom broke off and water is flooding across tiles."
    },
    {
      title: "Wi-Fi portal gives error 502",
      desc: "Student network gateway refused connection for all laptops in hostel wing C."
    },
    {
      title: "Short ambiguous remark",
      desc: "Something is broken in room."
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="bg-[#F0E9FF] dark:bg-[#0F1530] p-6 sm:p-8 rounded-3xl border border-violet-200/80 dark:border-white/10 shadow-card-light dark:shadow-card-dark space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase font-mono font-bold px-3 py-1 rounded-full bg-violet-200 dark:bg-violet-900/40 text-primaryViolet dark:text-darkPurple border border-violet-300 dark:border-violet-700/60">
            Real Scikit-Learn Model Telemetry
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">• Stratified Held-Out Test Set (80/20)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">
          Machine Learning Model Evaluation & Viva Defense
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
          ResolveX AI utilizes a genuine TF-IDF vectorizer + Multinomial Logistic Regression pipeline. The evaluation report below is computed directly on held-out test data not exposed during training.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">Loading model evaluation metrics...</div>
      ) : modelInfo?.metrics ? (
        <>
          {/* Top Headline Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-[#171F3B] border border-violet-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
              <div className="text-[11px] font-bold uppercase tracking-wider text-primaryViolet dark:text-darkPurple mb-1">Overall Accuracy</div>
              <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {(modelInfo.metrics.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Held-out test set accuracy</div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#171F3B] border border-emerald-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-darkMint mb-1">Macro F1-Score</div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-darkMint">
                {modelInfo.metrics.macro_f1.toFixed(3)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Harmonic mean of precision & recall</div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#171F3B] border border-blue-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brightBlue dark:text-darkCyan mb-1">Dataset Volume</div>
              <div className="text-3xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">
                {modelInfo.dataset.total_samples}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Labeled samples (10 categories)</div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-[#171F3B] border border-amber-100 dark:border-white/10 shadow-card-light dark:shadow-card-dark">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-darkAmber mb-1">Validation Split</div>
              <div className="text-2xl font-black text-amber-600 dark:text-darkAmber">
                {modelInfo.dataset.train_test_split}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Train: {modelInfo.dataset.train_samples} | Test: {modelInfo.dataset.test_samples}</div>
            </div>
          </div>

          {/* Per-Class Table */}
          <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-black text-[#172033] dark:text-[#F8FAFC]">Per-Category Performance Report</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Class-level evaluation metrics from Scikit-Learn classification report</p>
              </div>
              <span className="text-[10px] font-mono bg-violet-100 dark:bg-white/10 border border-violet-200 dark:border-white/10 text-primaryViolet dark:text-darkCyan font-bold px-2.5 py-1 rounded-lg">
                Sklearn Pipeline
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F1530] text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
                    <th className="py-3 px-4 font-sans">Category Name</th>
                    <th className="py-3 px-4 text-emerald-700 dark:text-darkMint">Precision</th>
                    <th className="py-3 px-4 text-brightBlue dark:text-darkCyan">Recall</th>
                    <th className="py-3 px-4 text-primaryViolet dark:text-darkPurple">F1-Score</th>
                    <th className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">Test Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {Object.entries(modelInfo.metrics.per_class || {}).map(([cat, m]: [string, any]) => (
                    <tr key={cat} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">{cat}</td>
                      <td className="py-3 px-4 text-emerald-700 dark:text-darkMint font-extrabold">{m.precision.toFixed(3)}</td>
                      <td className="py-3 px-4 text-brightBlue dark:text-darkCyan font-extrabold">{m.recall.toFixed(3)}</td>
                      <td className="py-3 px-4 text-primaryViolet dark:text-darkPurple font-extrabold">{m.f1_score.toFixed(3)}</td>
                      <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-bold">{m.support}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10x10 Confusion Matrix Visualizer */}
          {modelInfo.metrics.confusion_matrix && (
            <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-[#172033] dark:text-[#F8FAFC]">10x10 Multi-Class Confusion Matrix</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Rows = Actual Ground Truth Labels • Columns = Predicted Labels</p>
                </div>
                <span className="text-[10px] font-mono text-primaryViolet dark:text-darkCyan bg-violet-100 dark:bg-white/10 px-2.5 py-1 rounded-md border border-violet-200 dark:border-white/10 font-bold">
                  Diagonal = True Positives
                </span>
              </div>

              <div className="overflow-x-auto pt-2">
                <table className="text-[11px] border-collapse font-mono w-full">
                  <thead>
                    <tr>
                      <th className="p-2 text-slate-500 dark:text-slate-400 font-sans text-left font-bold">Ground Truth \ Pred</th>
                      {modelInfo.metrics.classes_order?.map((_: string, idx: number) => (
                        <th key={idx} className="p-2 text-center text-slate-500 dark:text-slate-400 font-bold">
                          C{idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modelInfo.metrics.confusion_matrix.map((row: number[], rowIdx: number) => (
                      <tr key={rowIdx}>
                        <td className="p-2 font-sans font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                          C{rowIdx + 1} ({modelInfo.metrics.classes_order[rowIdx].slice(0, 18)}...)
                        </td>
                        {row.map((val: number, colIdx: number) => {
                          const isDiagonal = rowIdx === colIdx;
                          return (
                            <td
                              key={colIdx}
                              className={`p-2 text-center border border-slate-100 dark:border-white/5 rounded-lg ${
                                isDiagonal && val > 0
                                  ? 'bg-primaryViolet dark:bg-darkPurple text-white font-black shadow-xs'
                                  : val > 0
                                  ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Interactive Live Inference Console */}
      <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-base">
            <Terminal className="w-5 h-5 text-brightBlue dark:text-darkCyan" />
            <span>Interactive Live Inference Console</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Test the loaded scikit-learn classifier pipeline in real-time. Enter custom complaint sentences to inspect class probabilities and token attribution.
          </p>
        </div>

        {/* Quick sample buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Try quick test sentences:</span>
          {sampleInputs.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTestTitle(sample.title);
                setTestDescription(sample.desc);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-primaryViolet dark:text-darkCyan border border-slate-200 dark:border-white/10 transition-colors font-bold text-[11px]"
            >
              {sample.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleRunPlayground} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1 space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Test Title
              </label>
              <input
                type="text"
                required
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Electrical wire burning"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 font-medium"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Test Description
              </label>
              <input
                type="text"
                required
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
                placeholder="e.g. Smell of burnt rubber in laboratory with sparks near wall plug."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 text-xs text-[#172033] dark:text-[#F8FAFC] focus:bg-white dark:focus:bg-[#151D38] focus:outline-none focus:border-primaryViolet dark:focus:border-cyan-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={evaluating || !testTitle.trim() || !testDescription.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primaryViolet to-brightBlue text-white font-bold text-xs shadow-glossy-light dark:shadow-neon-violet/30 disabled:opacity-50 transition-all hover:scale-102"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{evaluating ? 'Computing Vectorizer...' : 'Run Pipeline Inference'}</span>
          </button>
        </form>

        {testResult && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200 dark:border-white/10 shadow-2xs space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Predicted Category: </span>
                <span className="text-sm font-black text-primaryViolet dark:text-darkCyan">{testResult.predicted_category}</span>
              </div>
              <div className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                Confidence: <span className="font-black text-[#172033] dark:text-[#F8FAFC]">{(testResult.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            {testResult.is_uncertain && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{testResult.uncertainty_note}</span>
              </div>
            )}

            {testResult.influential_features?.length > 0 && (
              <div>
                <div className="font-extrabold text-slate-800 dark:text-slate-200 mb-2">Attributed Feature Tokens (TF-IDF * Model Weights):</div>
                <div className="flex flex-wrap gap-1.5">
                  {testResult.influential_features.map((feat) => (
                    <span key={feat} className="px-2.5 py-1 rounded-md bg-white dark:bg-[#151D38] border border-sky-200 dark:border-cyan-500/30 text-sky-800 dark:text-darkCyan font-mono text-[11px] font-bold shadow-2xs">
                      +{feat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {testResult.category_probabilities && (
              <div>
                <div className="font-extrabold text-slate-800 dark:text-slate-200 mb-2">Top Class Probability Distribution:</div>
                <div className="space-y-2">
                  {Object.entries(testResult.category_probabilities).map(([cat, prob]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <div className="w-48 truncate text-slate-700 dark:text-slate-300 font-medium">{cat}</div>
                      <div className="flex-1 bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primaryViolet to-brightBlue h-2 rounded-full"
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                      <div className="w-12 text-right font-mono text-slate-800 dark:text-slate-200 font-bold">{(prob * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Viva Defense Guide Cards */}
      <div className="bg-white dark:bg-[#171F3B] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-card-light dark:shadow-card-dark p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#172033] dark:text-[#F8FAFC] font-black text-base">
          <BookOpen className="w-5 h-5 text-primaryViolet dark:text-darkPurple" />
          <span>Examiner Defense & Viva Foundations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/80 dark:border-white/5 space-y-2 shadow-2xs">
            <h4 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">Q: Why did you choose TF-IDF + Logistic Regression?</h4>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              TF-IDF captures domain-specific keyword salience while dampening common words across documents. Logistic Regression provides fast CPU inference (&lt; 4ms), well-calibrated class probabilities, and linear coefficients that enable direct mathematical feature explainability without needing heavy black-box neural networks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/80 dark:border-white/5 space-y-2 shadow-2xs">
            <h4 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">Q: Why is Priority predicted by a scoring engine instead of ML?</h4>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              Urgency and safety risk are governed by physical campus policies (e.g. live electric sparking, padlocked fire exits) where deterministic safety thresholds must never be left to stochastic probability fluctuations. The documented rubric guarantees safety floor overrides.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/80 dark:border-white/5 space-y-2 shadow-2xs">
            <h4 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">Q: What is the limitation of the synthetic starter dataset?</h4>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              The dataset contains 500 representative, balanced synthetic complaints across 10 categories. While it proves model fitting, vectorization, and pipeline architecture, production deployment would require continuous retraining on real student facility tickets.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#0F1530] border border-slate-200/80 dark:border-white/5 space-y-2 shadow-2xs">
            <h4 className="font-extrabold text-[#172033] dark:text-[#F8FAFC] text-sm">Q: How does Duplicate Detection work?</h4>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              Using TF-IDF cosine similarity, newly submitted complaints are matched against recent active database records. Pairs exceeding the 0.50 similarity threshold are surfaced to administrators as candidates for review without destructive automated merging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
