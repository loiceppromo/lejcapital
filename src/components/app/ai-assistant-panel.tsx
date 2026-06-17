'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { aiChat, type AIMessage } from '@/app/actions/ai';

const QUICK_PROMPTS = [
  { label: 'Morning briefing', prompt: 'Give me a morning briefing on the fund status.' },
  { label: 'PCR analysis', prompt: 'Analyze the current PCR position and recommend actions to optimize it.' },
  { label: 'Loan portfolio review', prompt: 'Review the loan portfolio health. Flag any concerns and suggest actions.' },
  { label: 'Sleeve rebalancing', prompt: 'Should we rebalance the sleeve allocations? What changes would improve the fund posture?' },
  { label: 'Liquidity check', prompt: 'Assess our liquidity position. How many months of runway do we have and what are the risks?' },
  { label: 'Stress test summary', prompt: 'Summarize the stress test results and recommend hedging actions.' },
];

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);
    const userMsg: AIMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const result = await aiChat(messages, text.trim());

    if (result.ok && result.reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply! }]);
    } else {
      setError(result.error ?? 'Failed to get response.');
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [messages, loading]);

  const handleQuickPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  return (
    <div className="flex flex-col rounded-lg border border-brand-line bg-white overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-line bg-brand-panel px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-blue-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-black">LEJ AI Advisor</p>
            <p className="text-[10px] text-brand-muted">Fund-aware analysis · local fallback enabled</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="rounded-md border border-brand-line px-2 py-1 text-[10px] font-medium text-brand-muted hover:border-brand-charcoal hover:text-brand-black"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-surface">
              <svg className="h-8 w-8 text-brand-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-brand-black">LEJ AI Advisor</h3>
            <p className="mt-1 max-w-sm text-xs text-brand-muted">
              Ask about fund strategy, risk analysis, loan decisions, or get a morning briefing. If the API provider is unavailable, LEJ still uses local fund calculations.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="rounded-full border border-brand-line bg-white px-3 py-1.5 text-[11px] font-medium text-brand-charcoal hover:border-brand-navy hover:text-brand-navy transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-navy text-white'
                  : 'border border-brand-line bg-brand-surface text-brand-black'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-surface px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-navy" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-navy" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-navy" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-brand-muted">Analyzing fund data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Quick actions bar */}
      {messages.length > 0 && (
        <div className="border-t border-brand-line bg-brand-panel/50 px-3 py-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.slice(0, 4).map((qp) => (
              <button
                key={qp.label}
                onClick={() => handleQuickPrompt(qp.prompt)}
                disabled={loading}
                className="shrink-0 rounded-full border border-brand-line bg-white px-2.5 py-1 text-[10px] font-medium text-brand-muted hover:border-brand-charcoal hover:text-brand-black disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-brand-line bg-white px-3 py-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about fund strategy, risk, loans, or decisions..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-brand-line bg-brand-surface px-3 py-2 text-sm text-brand-black placeholder:text-brand-muted focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white hover:bg-brand-navy/90 disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-brand-muted">
          Press Enter to send · Shift+Enter for new line · Uses live fund context with local fallback
        </p>
      </div>
    </div>
  );
}
