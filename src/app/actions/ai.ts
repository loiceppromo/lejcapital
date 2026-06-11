'use server';

import { getOpenAIClient, isAIConfigured } from '@/lib/ai/client';
import { buildSystemPrompt, buildAutoLogPrompt, buildDecisionPrompt } from '@/lib/ai/prompts';
import { loadPlatformState } from '@/lib/data/queries';
import { requirePermission } from '@/lib/auth/server';
import { writeAuditLog } from './audit';
import type { ActionResult } from './market';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResult extends ActionResult {
  reply?: string;
}

export async function aiChat(
  messages: AIMessage[],
  userMessage: string,
): Promise<AIChatResult> {
  if (!isAIConfigured()) return { ok: false, error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local.' };
  await requirePermission('VIEW_DASHBOARD');

  try {
    const state = await loadPlatformState();
    const systemPrompt = buildSystemPrompt(state);
    const client = getOpenAIClient();

    const history = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? 'No response generated.';
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'AI request failed.' };
  }
}

export async function aiAnalyzeDecision(question: string): Promise<AIChatResult> {
  if (!isAIConfigured()) return { ok: false, error: 'OpenAI API key not configured.' };
  await requirePermission('VIEW_DASHBOARD');

  try {
    const state = await loadPlatformState();
    const systemPrompt = buildSystemPrompt(state);
    const decisionPrompt = buildDecisionPrompt(question);
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: decisionPrompt },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? 'No analysis generated.';

    await writeAuditLog('AI_DECISION_ANALYSIS', 'AIAdvisor', 'system', {
      question,
      responseLength: reply.length,
    });

    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'AI request failed.' };
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

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: logPrompt },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? '';
    return { ok: true, reply };
  } catch {
    return { ok: false, error: 'Auto-log generation failed.' };
  }
}

export async function aiQuickInsight(): Promise<AIChatResult> {
  if (!isAIConfigured()) return { ok: false, error: 'OpenAI API key not configured.' };
  await requirePermission('VIEW_DASHBOARD');

  try {
    const state = await loadPlatformState();
    const systemPrompt = buildSystemPrompt(state);
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 800,
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
    });

    const reply = response.choices[0]?.message?.content ?? 'No insight generated.';
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'AI request failed.' };
  }
}
