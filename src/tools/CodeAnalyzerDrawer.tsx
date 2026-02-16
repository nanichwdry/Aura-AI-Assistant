import React, { useState, useEffect } from 'react';
import { X, Code, AlertCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeCode, fixCode, CodeAnalysisResponse } from '../services/codeApi';

interface Props {
  onClose: () => void;
}

export function CodeAnalyzerDrawer({ onClose }: Props) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('tsx');
  const [result, setResult] = useState<CodeAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; raw?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'patch' | 'final' | 'raw'>('issues');
  const [showRawOutput, setShowRawOutput] = useState(false);

  useEffect(() => {
    if (!code.trim()) return;
    
    const detectLanguage = (code: string): string => {
      if (/import\s+.*\s+from|export\s+(default|const|function|class)|interface\s+\w+|type\s+\w+\s*=/.test(code)) {
        return /\.tsx|<\w+|<\/\w+|React|JSX/.test(code) ? 'tsx' : 'ts';
      }
      if (/<\w+|<\/\w+|className=|React/.test(code)) {
        return 'jsx';
      }
      if (/def\s+\w+\(|import\s+\w+|from\s+\w+\s+import|class\s+\w+:|print\(/.test(code)) {
        return 'py';
      }
      return 'js';
    };
    
    setLanguage(detectLanguage(code));
  }, [code]);

  const handleAnalyze = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeCode({ code, language });
      setResult(res);
      setActiveTab(res.raw_text ? 'raw' : 'issues');
    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorParts = err.message.split(' (');
      setError({ 
        message: errorParts[0], 
        details: errorParts[1]?.replace(')', ''),
        raw: err.raw_model_output 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fixCode({ code, language });
      setResult(res);
      setActiveTab(res.raw_text ? 'raw' : 'patch');
    } catch (err: any) {
      const errorParts = err.message.split(' (');
      setError({ 
        message: errorParts[0], 
        details: errorParts[1]?.replace(')', ''),
        raw: err.raw_model_output 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPatch = () => {
    if (result?.final_files?.[0]?.content) {
      setCode(result.final_files[0].content);
      setResult(null);
      setError(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl shadow-2xl flex flex-col">
        <header className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <img src="/Aura AI logo.png" alt="Aura Logo" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-white">Code Analyzer</h1>
              <p className="text-sm text-zinc-400">Write, Paste, Analyze, Improve.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-slate-800/50 flex flex-col">
            <div className="p-4 border-b border-slate-800/50 flex gap-2">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-gray-300">
                <option value="tsx">TSX</option>
                <option value="ts">TypeScript</option>
                <option value="jsx">JSX</option>
                <option value="js">JavaScript</option>
                <option value="py">Python</option>
              </select>
              <button onClick={handleAnalyze} disabled={loading || !code.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Analyze
              </button>
              <button onClick={handleFix} disabled={loading || !code.trim()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                Fix
              </button>
            </div>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code here..." className="flex-1 p-4 bg-slate-950/50 text-gray-300 font-mono text-sm resize-none outline-none" />
          </div>

          <div className="w-1/2 flex flex-col">
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-400">Analyzing code...</p>
                </div>
              </div>
            )}
            
            {!loading && error && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-3">
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">{error.message}</p>
                        {error.details && (
                          <p className="text-sm opacity-80">{error.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {error.raw && (
                    <div>
                      <button 
                        onClick={() => setShowRawOutput(!showRawOutput)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        {showRawOutput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Show raw model output
                      </button>
                      {showRawOutput && (
                        <pre className="mt-2 p-3 bg-slate-950/50 rounded-lg text-xs text-gray-400 overflow-auto max-h-40">
                          {error.raw}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!loading && !error && result && (
              <>
                <div className="flex border-b border-slate-800/50">
                  {(result.raw_text ? ['raw'] : ['issues', 'patch', 'final']).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {activeTab === 'raw' && result.raw_text && (
                    <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300">{result.raw_text}</pre>
                    </div>
                  )}

                  {activeTab === 'issues' && !result.raw_text && (
                    <div className="space-y-4">
                      {result.summary && (
                        <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${result.summary.risk_level === 'high' ? 'bg-red-500' : result.summary.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'} text-white`}>
                              {result.summary.risk_level}
                            </span>
                            <span className="text-sm font-medium text-gray-300">Risk Level</span>
                          </div>
                          {result.summary.main_problems?.length > 0 && (
                            <div className="text-sm text-gray-400 mt-2">
                              {result.summary.main_problems.map((p, i) => (
                                <div key={i}>• {p}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {result.issues?.length > 0 ? result.issues.map((issue, i) => (
                        <div key={i} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)} text-white`}>
                              {issue.severity}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-200 mb-1">{issue.title}</h4>
                              <p className="text-sm text-gray-400 mb-2">{issue.why_it_matters}</p>
                              {issue.fix && (
                                <div className="text-xs text-gray-500 bg-slate-900/50 p-2 rounded">
                                  Fix: {issue.fix}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-gray-500">
                          No issues found
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'patch' && !result.raw_text && (
                    <div className="space-y-4">
                      {result.patches?.length > 0 ? result.patches.map((patch, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">{patch.path}</span>
                            <button onClick={() => copyToClipboard(patch.patch_unified_diff)} className="p-1 hover:bg-slate-800/50 rounded">
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <pre className="p-4 bg-slate-950/50 rounded-lg text-xs text-gray-300 font-mono overflow-x-auto">
                            {patch.patch_unified_diff || '(empty patch)'}
                          </pre>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-gray-500">
                          No patches generated
                        </div>
                      )}
                      {result.final_files?.[0] && (
                        <button onClick={handleApplyPatch} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                          Apply Patch
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'final' && !result.raw_text && (
                    <div className="space-y-4">
                      {result.final_files?.length > 0 ? result.final_files.map((file, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-400">{file.path}</span>
                            <button onClick={() => copyToClipboard(file.content)} className="p-1 hover:bg-slate-800/50 rounded">
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <pre className="p-4 bg-slate-950/50 rounded-lg text-xs text-gray-300 font-mono overflow-x-auto max-h-96">
                            {file.content}
                          </pre>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-gray-500">
                          No final files generated
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {!loading && !error && !result && (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Paste code and click Analyze or Fix
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
