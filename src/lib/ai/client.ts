import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set.');
    _client = new OpenAI({ apiKey: key });
  }
  return _client;
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-5.5';
}
