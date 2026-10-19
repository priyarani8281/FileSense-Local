import React, { useState } from 'react';
import {
  MessageSquareQuote,
  Send,
  Sparkles,
  ExternalLink,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api.js';

export function AskPage({
  initialQuestion = '',
  onOpenDocument,
  onViewDoc,
  showToast
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      question: null,
      answer: "Hello! I am your local AI document assistant. Ask me questions about your notes, invoices, resumes, or research papers. I will retrieve the exact passages from your indexed documents and provide a grounded response with source citations.",
      citations: [],
      hasEvidence: true
    }
  ]);

  const exampleQuestions = [
    'Summarize the key points in my React notes.',
    'What are the 4 conditions for deadlock in operating systems?',
    'What rainfall threshold was identified in the landslide research?',
    'How much was billed in the March freelance invoice?'
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const clean = question.trim();
    if (!clean || isLoading) return;

    setIsLoading(true);
    setQuestion('');

    try {
      const res = await api.askDocuments(clean);
      setHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user_turn',
          question: clean,
          answer: res.answer,
          citations: res.citations || [],
          hasEvidence: res.hasEvidence,
          modelUsed: res.modelUsed,
          error: res.error
        }
      ]);
    } catch (err) {
      showToast(err.message, 'error');
      setHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user_turn',
          question: clean,
          answer: `Could not answer question: ${err.message}`,
          citations: [],
          hasEvidence: false,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExample = (ex) => {
    setQuestion(ex);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
      {/* Editorial Header */}
      <div style={{ textAlign: 'center', paddingTop: '10px' }}>
        <h1 style={{ fontSize: '2.1rem', marginBottom: '8px' }}>Ask Your Documents</h1>
        <p style={{ fontSize: '0.96rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Local AI synthesis grounded exclusively in your own indexed files. No hallucinations, full citations.
        </p>
      </div>

      {/* Suggested Questions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        {exampleQuestions.map((ex, i) => (
          <button
            key={i}
            type="button"
            className="chip"
            onClick={() => handleSelectExample(ex)}
          >
            <Sparkles size={12} color="var(--accent-terracotta)" />
            <span>{ex}</span>
          </button>
        ))}
      </div>

      {/* Conversation Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {history.map((turn) => (
          <div key={turn.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* User Question */}
            {turn.question && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--accent-forest)', color: '#FFFDF8', padding: '12px 18px', borderRadius: 'var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)', fontSize: '0.96rem', fontWeight: 500, boxShadow: 'var(--shadow-sm)' }}>
                {turn.question}
              </div>
            )}

            {/* Assistant Response Card */}
            <div className="card" style={{ borderLeft: '4px solid var(--accent-forest)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-full)', background: 'var(--accent-forest-subtle)', color: 'var(--accent-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquareQuote size={15} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>FileSense Local AI</span>
                  {turn.modelUsed && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({turn.modelUsed})</span>
                  )}
                </div>

                {!turn.hasEvidence && turn.question && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--accent-terracotta-subtle)', color: 'var(--accent-terracotta)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                    Insufficient Evidence
                  </span>
                )}
              </div>

              {/* Answer Text */}
              <div style={{ fontSize: '0.95rem', lineHeight: 1.65, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {turn.answer}
              </div>

              {/* Citations List */}
              {turn.citations?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Grounding Citations & Sources ({turn.citations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {turn.citations.map((c) => (
                      <div
                        key={c.citationIndex}
                        style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'var(--accent-forest)', color: '#FFFDF8', fontWeight: 700, fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px' }}>
                              [{c.citationIndex}]
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.filename}</span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Page {c.pageNumber}</span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-subtle btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                              onClick={() => onViewDoc(c.documentId)}
                            >
                              Inspect
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                              onClick={() => onOpenDocument(c.documentId)}
                              title="Open original file"
                            >
                              <ExternalLink size={12} />
                              <span>Open</span>
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '2px solid var(--accent-sage)', paddingLeft: '8px' }}>
                          "{c.excerpt}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent-forest)' }} />
            <div style={{ fontWeight: 500 }}>Retrieving relevant document passages & generating grounded response with local AI...</div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="search-hero-box" style={{ marginTop: '10px' }}>
        <input
          type="text"
          className="search-input"
          placeholder="Ask a question about your documents... e.g. 'What are the main risks mentioned in the report?'"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!question.trim() || isLoading}
        >
          <Send size={15} />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
