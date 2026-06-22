'use server';

import { getAIModel, getOpenAIClient, isAIConfigured } from '@/lib/ai/client';
import { buildLocalAdvisorReply, isQuotaLikeError } from '@/lib/ai/local-advisor';
import { buildSystemPrompt, buildAutoLogPrompt, buildDecisionPrompt } from '@/lib/ai/prompts';
import { loadPlatformState } from '@/lib/data/queries';
import { getActiveCycle } from '@/lib/platform/selectors';
import { requirePermission } from '@/lib/auth/server';
import { MANUAL_LEDGER_DESTINATIONS } from '@/lib/fund/ledger';
import { addLedgerEntry } from './ledger';
import { generateRecommendation } from './decisions';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResult extends ActionResult {
  reply?: string;
  actions?: AIActionResult[];
}

export interface AIActionResult {
  action: string;
  ok: boolean;
  message: string;
}

type ToolCallMessage = {
  role: 'assistant';
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | ToolCallMessage
  | { role: 'tool'; tool_call_id: string; content: string };

const AI_TIMEOUT_MS = 30_000;

const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_ledger_entry',
      description: 'Create an audited manual ledger entry for a clear fund cash movement. Use only when the user explicitly asks to record, add, post, or log a ledger/cash entry and gives amount, destination, movement, and note.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            enum: [...MANUAL_LEDGER_DESTINATIONS],
            description: 'Where the cash movement belongs: Businesses, T-Bills, or Stocks.',
          },
          movement: {
            type: 'string',
            enum: ['IN', 'OUT'],
            description: 'IN for money received, OUT for money deployed/spent.',
          },
          amount: {
            type: 'string',
            description: 'GHS amount as a positive decimal string, without commas or currency symbol.',
          },
          note: {
            type: 'string',
            description: 'Short audit-safe explanation for the entry.',
          },
          date: {
            type: 'string',
            description: 'Entry date in YYYY-MM-DD. If the user did not specify a date, use today.',
          },
        },
        required: ['destination', 'movement', 'amount', 'note', 'date'],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_allocation_recommendation',
      description: 'Create an auditable capital-allocation recommendation. Use only when the user explicitly asks to analyse, allocate, or recommend a deployment for a stated available GHS amount. This does not approve or execute a deployment.',
      parameters: {
        type: 'object',
        properties: {
          availableCapital: { type: 'string', description: 'Available GHS amount as a positive decimal string, without commas or currency symbol.' },
        },
        required: ['availableCapital'],
        additionalProperties: false,
      },
      strict: true,
    },
  },
] as const;

async function withTimeout<T>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('AI provider timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function todayAccra(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function normalizeDestination(input: string): (typeof MANUAL_LEDGER_DESTINATIONS)[number] | null {
  const value = input.toLowerCase();
  if (value.includes('t-bill') || value.includes('tbill') || value.includes('treasury')) return 'T-Bills';
  if (value.includes('stock') || value.includes('gse') || value.includes('equity') || value.includes('share')) return 'Stocks';
  if (value.includes('business') || value.includes('engine') || value.includes('undc') || value.includes('operating')) return 'Businesses';
  return null;
}

function inferMovement(input: string): 'IN' | 'OUT' | null {
  const value = input.toLowerCase();
  if (/\b(in|received|receive|profit|returned|income|cash in|money in|sale|sales)\b/.test(value)) return 'IN';
  if (/\b(out|spent|spend|paid|pay|purchase|buy|bought|invest|deploy|sent|cash out|money out)\b/.test(value)) return 'OUT';
  return null;
}

function extractAmount(input: string): string | null {
  const match = input.match(/(?:ghs|ghc|₵)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  if (!match) return null;
  return match[1].replaceAll(',', '');
}

function wantsWrite(input: string): boolean {
  return /\b(record|add|post|log|enter|save)\b/i.test(input) && /\b(ledger|cash|money|entry|transaction|t-?bill|stock|business)\b/i.test(input);
}

function wantsAllocation(input: string): boolean {
  return /\b(analy[sz]e|allocate|allocation|recommend|deploy)\b/i.test(input)
    && /\b(capital|cash|money|ghs|ghc|₵|funds?)\b/i.test(input);
}

async function createAllocationRecommendationFromAI(amount: string): Promise<AIActionResult> {
  const parsed = Number(amount.replaceAll(',', ''));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { action: 'create_allocation_recommendation', ok: false, message: 'I need a positive GHS amount to analyse for allocation.' };
  }
  const result = await generateRecommendation(parsed);
  return {
    action: 'create_allocation_recommendation',
    ok: result.ok,
    message: result.ok
      ? `Created an allocation recommendation for GHS ${parsed.toFixed(2)}. It is awaiting your review and approval in the Decision Centre.`
      : result.error ?? 'Could not create an allocation recommendation.',
  };
}

async function createLedgerEntryFromAI(input: {
  destination: string;
  movement: string;
  amount: string;
  note: string;
  date: string;
}): Promise<AIActionResult> {
  await requirePermission('ADD_LEDGER_ENTRY');
  const state = await loadPlatformState();
  const activeCycle = getActiveCycle(state);
  if (activeCycle.id === 'empty-cycle') {
    return {
      action: 'create_ledger_entry',
      ok: false,
      message: 'Create Cycle 1 before I can persist ledger entries.',
    };
  }

  const destination = normalizeDestination(input.destination);
  if (!destination) {
    return {
      action: 'create_ledger_entry',
      ok: false,
      message: 'Ledger destination must be Businesses, T-Bills, or Stocks.',
    };
  }
  const movement = input.movement === 'IN' || input.movement === 'OUT' ? input.movement : null;
  if (!movement) {
    return {
      action: 'create_ledger_entry',
      ok: false,
      message: 'Money movement must be Money in or Money out.',
    };
  }

  const formData = new FormData();
  formData.set('date', input.date || todayAccra());
  formData.set('account', destination);
  formData.set('description', input.note);
  formData.set('direction', movement);
  formData.set('amount', input.amount);
  formData.set('source', 'AIAdvisor');
  formData.set('cycleId', activeCycle.id);
  const result = await addLedgerEntry(formData);
  return {
    action: 'create_ledger_entry',
    ok: result.ok,
    message: result.ok
      ? `Recorded ${movement === 'IN' ? 'money in' : 'money out'} of GHS ${input.amount} to ${destination}.`
      : result.error ?? 'Ledger entry failed.',
  };
}

async function maybeHandleLocalWrite(userMessage: string): Promise<AIActionResult | null> {
  if (!wantsWrite(userMessage)) return null;
  const destination = normalizeDestination(userMessage);
  const movement = inferMovement(userMessage);
  const amount = extractAmount(userMessage);
  if (!destination || !movement || !amount) {
    return {
      action: 'create_ledger_entry',
      ok: false,
      message: 'I can record it, but I need amount, destination (Businesses, T-Bills, or Stocks), and whether it is money in or money out.',
    };
  }
  return createLedgerEntryFromAI({
    destination,
    movement,
    amount,
    note: userMessage.slice(0, 180),
    date: todayAccra(),
  });
}

async function maybeHandleLocalAllocation(userMessage: string): Promise<AIActionResult | null> {
  if (!wantsAllocation(userMessage)) return null;
  const amount = extractAmount(userMessage);
  if (!amount) {
    return { action: 'create_allocation_recommendation', ok: false, message: 'I can prepare a recommendation, but I need the available GHS amount to analyse.' };
  }
  return createAllocationRecommendationFromAI(amount);
}

async function executeToolCall(name: string, rawArgs: string): Promise<AIActionResult> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || '{}') as Record<string, unknown>;
  } catch {
    return { action: name, ok: false, message: 'Tool arguments were not valid JSON.' };
  }

  if (name === 'create_ledger_entry') {
    return createLedgerEntryFromAI({
      destination: String(args.destination ?? ''),
      movement: String(args.movement ?? ''),
      amount: String(args.amount ?? ''),
      note: String(args.note ?? ''),
      date: String(args.date ?? todayAccra()),
    });
  }
  if (name === 'create_allocation_recommendation') {
    return createAllocationRecommendationFromAI(String(args.availableCapital ?? ''));
  }

  return { action: name, ok: false, message: `Unknown AI tool: ${name}` };
}

export async function aiChat(
  messages: AIMessage[],
  userMessage: string,
): Promise<AIChatResult> {
  await requirePermission('VIEW_DASHBOARD');
  const state = await loadPlatformState();
  // Fallback actions are deliberately deferred. When OpenAI is live, only an
  // explicit tool call can write. This prevents the local parser and model
  // from both recording the same financial action.
  const resolveLocalAction = async () => {
    const ledgerAction = await maybeHandleLocalWrite(userMessage);
    return ledgerAction ?? maybeHandleLocalAllocation(userMessage);
  };
  if (!isAIConfigured()) {
    const localAction = await resolveLocalAction();
    const reply = localAction
      ? `${localAction.ok ? 'Done.' : 'I could not complete that yet.'} ${localAction.message}\n\n${buildLocalAdvisorReply(state, userMessage)}`
      : buildLocalAdvisorReply(state, userMessage);
    return { ok: true, reply, actions: localAction ? [localAction] : [] };
  }

  try {
    const systemPrompt = buildSystemPrompt(state);
    const client = getOpenAIClient();

    const history = messages.map((m): ChatMessage => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage },
    ];

    const response = await withTimeout(client.chat.completions.create({
      model: getAIModel(),
      temperature: 0.2,
      max_completion_tokens: 2200,
      tools: AI_TOOLS,
      tool_choice: 'auto',
      messages: [
        ...chatMessages,
      ] as never,
    } as never));

    const responseMessage = response.choices[0]?.message as ToolCallMessage | undefined;
    const toolCalls = responseMessage?.tool_calls ?? [];
    if (toolCalls.length > 0 && responseMessage) {
      const actions: AIActionResult[] = [];
      const followUpMessages: ChatMessage[] = [...chatMessages, responseMessage];
      for (const toolCall of toolCalls) {
        const action = await executeToolCall(toolCall.function.name, toolCall.function.arguments);
        actions.push(action);
        followUpMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(action),
        });
      }

      const finalResponse = await withTimeout(client.chat.completions.create({
        model: getAIModel(),
        temperature: 0.2,
        max_completion_tokens: 1200,
        tools: AI_TOOLS,
        messages: followUpMessages as never,
      } as never));

      const reply = finalResponse.choices[0]?.message?.content ?? actions.map((a) => a.message).join('\n');
      return { ok: true, reply, actions };
    }

    const reply = responseMessage?.content ?? 'No response generated.';
    return { ok: true, reply };
  } catch (err) {
    const localAction = await resolveLocalAction();
    const actionText = localAction ? `${localAction.ok ? 'Done.' : 'I could not complete that yet.'} ${localAction.message}\n\n` : '';
    if (isQuotaLikeError(err)) {
      return { ok: true, reply: `${actionText}${buildLocalAdvisorReply(state, userMessage)}`, actions: localAction ? [localAction] : [] };
    }
    return { ok: true, reply: `${actionText}${buildLocalAdvisorReply(state, userMessage)}`, actions: localAction ? [localAction] : [] };
  }
}

export async function aiAnalyzeDecision(question: string): Promise<AIChatResult> {
  await requirePermission('VIEW_DASHBOARD');
  const state = await loadPlatformState();
  if (!isAIConfigured()) {
    return { ok: true, reply: buildLocalAdvisorReply(state, question) };
  }

  try {
    const systemPrompt = buildSystemPrompt(state);
    const decisionPrompt = buildDecisionPrompt(question);
    const client = getOpenAIClient();

    const response = await withTimeout(client.chat.completions.create({
      model: getAIModel(),
      temperature: 0.2,
      max_completion_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: decisionPrompt },
      ],
    } as never));

    const reply = response.choices[0]?.message?.content ?? 'No analysis generated.';

    await writeAuditLog('AI_DECISION_ANALYSIS', 'AIAdvisor', 'system', {
      question,
      responseLength: reply.length,
    });

    return { ok: true, reply };
  } catch (err) {
    if (isQuotaLikeError(err)) {
      return { ok: true, reply: buildLocalAdvisorReply(state, question) };
    }
    return { ok: true, reply: buildLocalAdvisorReply(state, question) };
  }
}

export async function aiGenerateLog(
  action: string,
  entityType: string,
  details: Record<string, unknown>,
): Promise<AIChatResult> {
  if (!isAIConfigured()) return { ok: false, error: 'OpenAI API key not configured.' };

  try {
    const state = await loadPlatformState();
    const systemPrompt = buildSystemPrompt(state);
    const logPrompt = buildAutoLogPrompt(action, entityType, details);
    const client = getOpenAIClient();

    const response = await withTimeout(client.chat.completions.create({
      model: process.env.OPENAI_FAST_MODEL || 'gpt-5.5',
      temperature: 0.2,
      max_completion_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: logPrompt },
      ],
    } as never));

    const reply = response.choices[0]?.message?.content ?? '';
    return { ok: true, reply };
  } catch {
    return { ok: false, error: 'Auto-log generation failed.' };
  }
}

export async function aiQuickInsight(): Promise<AIChatResult> {
  await requirePermission('VIEW_DASHBOARD');
  const state = await loadPlatformState();
  if (!isAIConfigured()) {
    return { ok: true, reply: buildLocalAdvisorReply(state, 'morning briefing') };
  }

  try {
    const systemPrompt = buildSystemPrompt(state);
    const client = getOpenAIClient();

    const response = await withTimeout(client.chat.completions.create({
      model: getAIModel(),
      temperature: 0.3,
      max_completion_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Give me a brief morning briefing for the fund. Cover:
1. Overall health (PCR, NAV, risk status)
2. Any urgent items requiring attention
3. Top opportunity or recommendation for today

Keep it to 3-5 bullet points. Be direct.`,
        },
      ],
    } as never));

    const reply = response.choices[0]?.message?.content ?? 'No insight generated.';
    return { ok: true, reply };
  } catch (err) {
    if (isQuotaLikeError(err)) {
      return { ok: true, reply: buildLocalAdvisorReply(state, 'morning briefing') };
    }
    return { ok: true, reply: buildLocalAdvisorReply(state, 'morning briefing') };
  }
}
