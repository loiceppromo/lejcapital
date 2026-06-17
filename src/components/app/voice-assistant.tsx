'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveCycle,
  getInvestorPrincipalDue,
  getLiquidityCliffRadar,
  getLoanMetrics,
  getOverview,
  getPlatformState,
  money,
  pct,
  ratio,
} from '@/lib/platform/selectors';

// ── Types ──

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

// ── Speech API helpers ──

function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}

function speak(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ??
    voices.find((v) => v.lang.startsWith('en') && !v.localService) ??
    voices.find((v) => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

// ── Intent matching ──

function matchIntent(transcript: string): string {
  const lower = transcript.toLowerCase().trim();
  const state = getPlatformState();
  const overview = getOverview(state);
  const cycle = getActiveCycle(state);
  const loanMetrics = getLoanMetrics(state);
  const cliff = getLiquidityCliffRadar(state);
  const investorDue = getInvestorPrincipalDue(state);

  // Daily brief
  if (lower.includes('daily brief') || lower.includes('brief') || lower.includes('summary') || lower.includes('overview') || lower.includes('how are we doing') || lower.includes('status')) {
    return buildDailyBrief(overview, cycle, loanMetrics, cliff, investorDue, state);
  }

  // NAV
  if (lower.includes('nav') || lower.includes('net asset')) {
    return `The current Net Asset Value is ${money(overview.currentNAV)}. ` +
      `That breaks down into Protection ${money(overview.pcr.liquidAssets)}, ` +
      `loan book net value ${money(overview.loanMetrics.netValue)}, ` +
      `and market portfolio.`;
  }

  // PCR
  if (lower.includes('pcr') || lower.includes('protection') || lower.includes('cover ratio') || lower.includes('coverage')) {
    return `The Protection Cover Ratio is ${ratio(overview.pcr.pcr)}, which is in the ${overview.pcr.status} band. ` +
      `Liquid assets are ${money(overview.pcr.liquidAssets)} against capital principal due of ${money(investorDue)}. ` +
      (overview.pcr.status !== 'GREEN' ? 'Action is needed to improve coverage.' : 'The fund is well-covered.');
  }

  // Loans
  if (lower.includes('loan') || lower.includes('lending') || lower.includes('borrower')) {
    const activeLoans = loanMetrics.summaries.filter((s) => s.status === 'ACTIVE').length;
    const defaulted = loanMetrics.summaries.filter((s) => s.status === 'DEFAULTED').length;
    return `The loan book has ${loanMetrics.summaries.length} loan${loanMetrics.summaries.length !== 1 ? 's' : ''}. ` +
      `${activeLoans} active, ${defaulted} defaulted. ` +
      `Total outstanding is ${money(loanMetrics.totalOutstanding)} with provisions of ${money(loanMetrics.totalProvisions)}. ` +
      `PAR greater than 30 days is ${pct(loanMetrics.par30)}. ` +
      `The portfolio default rate is ${pct(loanMetrics.defaultRate)}.`;
  }

  // Investors
  if (lower.includes('investor') || lower.includes('partner') || lower.includes('contribution') || lower.includes('principal due')) {
    return `There are ${state.investors.length} active capital partners. ` +
      `Total capital principal due is ${money(investorDue)}. ` +
      `The fund is in Cycle ${cycle.sequenceNo}, status ${cycle.status}.`;
  }

  // Risk
  if (lower.includes('risk') || lower.includes('breach') || lower.includes('warning')) {
    return overview.riskBreaches > 0
      ? `There are ${overview.riskBreaches} active risk breaches. ` +
        `The following actions are required: ${overview.actionRequired.slice(0, 3).join('. ')}.`
      : `There are no risk breaches. All controls are within limits. The fund is operating normally.`;
  }

  // Liquidity
  if (lower.includes('liquidity') || lower.includes('cliff') || lower.includes('cash') || lower.includes('run out')) {
    return `Liquidity status is ${cliff.status}. ` +
      `Available buffer is ${money(cliff.availableBuffer)}. ` +
      (cliff.cliffDate
        ? `The projected liquidity cliff is ${cliff.cliffDate}, which is ${cliff.daysUntilCliff} days away. `
        : `No liquidity cliff is projected. `) +
      `${cliff.action}`;
  }

  // Cycle
  if (lower.includes('cycle') || lower.includes('period') || lower.includes('when')) {
    return `We are in Cycle ${cycle.sequenceNo}, which is ${cycle.status}. ` +
      `It runs from ${cycle.startDate} to ${cycle.endDate}. ` +
      `${cliff.daysUntilCycleEnd} days remain in this cycle.`;
  }

  // Market
  if (lower.includes('market') || lower.includes('portfolio') || lower.includes('gse') || lower.includes('t-bill') || lower.includes('tbill')) {
    const gseOK = overview.marketPolicy.gseExposure.withinLimit;
    return `The market portfolio has ${state.marketHoldings.length} holdings. ` +
      `GSE exposure is ${pct(overview.marketPolicy.gseExposure.currentPct)}, which is ${gseOK ? 'within' : 'above'} the limit. ` +
      `The current market regime is ${state.requestedRegime}.`;
  }

  // Businesses / engines
  if (lower.includes('business') || lower.includes('engine') || lower.includes('undc') || lower.includes('operating')) {
    return `There are ${state.engines.length} operating businesses registered. ` +
      `${state.engineRecords.filter((e) => e.status === 'ACTIVE').length} are active in the current cycle.`;
  }

  // Help
  if (lower.includes('help') || lower.includes('what can you') || lower.includes('command')) {
    return `I can help you with the following. Say: ` +
      `"daily brief" for a full status summary, ` +
      `"what's the NAV" for net asset value, ` +
      `"PCR status" for protection coverage, ` +
      `"loan book" for lending status, ` +
      `"partners" for capital partner information, ` +
      `"risk" for risk breaches, ` +
      `"liquidity" for cash runway, ` +
      `"cycle" for cycle timing, ` +
      `"market" for portfolio status, or ` +
      `"businesses" for operating engine status.`;
  }

  // Greeting
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon')) {
    return `Hello! I'm your LEJ Capital assistant. I can give you a daily brief, answer questions about your fund, ` +
      `or check specific metrics like NAV, PCR, loans, and liquidity. What would you like to know?`;
  }

  // Fallback
  return `I didn't quite catch that. Try saying "daily brief" for a full summary, or "help" for a list of commands I understand.`;
}

function buildDailyBrief(
  overview: ReturnType<typeof getOverview>,
  cycle: ReturnType<typeof getActiveCycle>,
  loanMetrics: ReturnType<typeof getLoanMetrics>,
  cliff: ReturnType<typeof getLiquidityCliffRadar>,
  investorDue: ReturnType<typeof getInvestorPrincipalDue>,
  state: ReturnType<typeof getPlatformState>,
): string {
  const parts: string[] = [];

  parts.push(`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}. Here's your LEJ Capital daily brief.`);

  parts.push(`We're in Cycle ${cycle.sequenceNo}, status ${cycle.status}, with ${cliff.daysUntilCycleEnd} days remaining.`);

  parts.push(`Net Asset Value is ${money(overview.currentNAV)}.`);

  parts.push(
    `The Protection Cover Ratio is ${ratio(overview.pcr.pcr)}, in the ${overview.pcr.status} band. ` +
    `Liquid assets are ${money(overview.pcr.liquidAssets)} against ${money(investorDue)} capital principal due.`
  );

  if (overview.riskBreaches > 0) {
    parts.push(`Warning: there are ${overview.riskBreaches} active risk breaches requiring attention.`);
  } else {
    parts.push(`All risk controls are green. No breaches.`);
  }

  const activeLoans = loanMetrics.summaries.filter((s) => s.status === 'ACTIVE').length;
  parts.push(
    `Loan book: ${activeLoans} active loans, ${money(loanMetrics.totalOutstanding)} outstanding. ` +
    `PAR greater than 30 is ${pct(loanMetrics.par30)}.`
  );

  parts.push(`Liquidity: ${cliff.status}. Buffer is ${money(cliff.availableBuffer)}.`);

  if (cliff.cliffDate) {
    parts.push(`Projected liquidity cliff in ${cliff.daysUntilCliff} days.`);
  }

  parts.push(`${state.investors.length} active capital partners. ${state.engines.length} registered businesses.`);

  if (overview.actionRequired.length > 0) {
    parts.push(`Top action items: ${overview.actionRequired.slice(0, 2).join('. ')}.`);
  }

  parts.push(`That's your brief. Ask me anything else, or say "help" for available commands.`);

  return parts.join(' ');
}

// ── Component ──

export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true;
    return Boolean(getSpeechRecognition());
  });
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const processInput = useCallback((text: string) => {
    const userMsg: Message = { role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('thinking');

    // Small delay to show "thinking" state
    setTimeout(() => {
      const response = matchIntent(text);
      const assistantMsg: Message = { role: 'assistant', text: response, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      setAssistantState('speaking');
      speak(response, () => setAssistantState('idle'));
    }, 300);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    stopListening();
    window.speechSynthesis?.cancel();

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-GH';

    recognition.onstart = () => {
      setAssistantState('listening');
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
      if (final) {
        processInput(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Voice] Recognition error:', event.error);
      }
      setAssistantState('idle');
    };

    recognition.onend = () => {
      if (assistantState === 'listening') {
        setAssistantState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopListening, processInput, assistantState]);

  function handleTextSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('voiceInput') as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    processInput(text);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setAssistantState('idle');
  }

  function readDailyBrief() {
    processInput('daily brief');
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="Voice assistant"
        aria-label="Open voice assistant"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-brand-line bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-line bg-brand-navy px-4 py-3 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-white">LEJ Voice Assistant</p>
            <p className="text-[10px] text-white/60">
              {assistantState === 'idle' ? 'Ready' : assistantState === 'listening' ? 'Listening...' : assistantState === 'thinking' ? 'Processing...' : 'Speaking...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { stopSpeaking(); stopListening(); setOpen(false); }}
          className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '360px', minHeight: '200px' }}>
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <svg viewBox="0 0 24 24" className="mx-auto h-12 w-12 text-brand-silver" fill="none" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-brand-charcoal">Hi, I&apos;m your fund assistant</p>
            <p className="mt-1 text-xs text-brand-muted">Tap the mic or type a question. Try &quot;daily brief&quot; or &quot;help&quot;.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-brand-navy text-white'
                : 'bg-brand-panel text-brand-charcoal'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {assistantState === 'listening' && transcript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-xl bg-brand-navy/50 px-3 py-2 text-[13px] text-white/70 italic">
              {transcript}...
            </div>
          </div>
        )}
        {assistantState === 'thinking' && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-brand-panel px-3 py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-muted [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 border-t border-brand-line px-4 py-2">
        <button
          onClick={readDailyBrief}
          className="rounded-full bg-brand-panel px-3 py-1 text-[11px] font-semibold text-brand-charcoal hover:bg-brand-line"
        >
          Daily brief
        </button>
        <button
          onClick={() => processInput("what's the PCR")}
          className="rounded-full bg-brand-panel px-3 py-1 text-[11px] font-semibold text-brand-charcoal hover:bg-brand-line"
        >
          PCR
        </button>
        <button
          onClick={() => processInput('loan book status')}
          className="rounded-full bg-brand-panel px-3 py-1 text-[11px] font-semibold text-brand-charcoal hover:bg-brand-line"
        >
          Loans
        </button>
        <button
          onClick={() => processInput('liquidity')}
          className="rounded-full bg-brand-panel px-3 py-1 text-[11px] font-semibold text-brand-charcoal hover:bg-brand-line"
        >
          Liquidity
        </button>
      </div>

      {!supported && (
        <div className="border-t border-brand-line bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Voice recognition isn&apos;t supported in this browser. Use Chrome or Edge for voice input, or type your questions below.
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-2 border-t border-brand-line px-4 py-3">
        <form onSubmit={handleTextSubmit} className="flex flex-1 gap-2">
          <input
            name="voiceInput"
            type="text"
            placeholder="Type or use the mic..."
            className="flex-1 rounded-lg border border-brand-line bg-white px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-navy px-3 py-2 text-white hover:bg-brand-navy/90"
            title="Send"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>

        {supported && (
          assistantState === 'speaking' ? (
            <button
              onClick={stopSpeaking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
              title="Stop speaking"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={startListening}
              disabled={assistantState === 'listening' || assistantState === 'thinking'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                assistantState === 'listening'
                  ? 'animate-pulse bg-red-500 text-white'
                  : 'bg-brand-navy text-white hover:bg-brand-navy/90 disabled:opacity-50'
              }`}
              title={assistantState === 'listening' ? 'Listening...' : 'Start voice input'}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
          )
        )}
      </div>
    </div>
  );
}
