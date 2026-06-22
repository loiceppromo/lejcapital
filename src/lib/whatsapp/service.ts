/** Provider-backed WhatsApp delivery. Disabled until Twilio credentials exist. */
export function isWhatsAppConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

function toE164(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`;
  return digits.startsWith('+') ? value : `+${digits}`;
}

export async function sendWhatsAppMessage(to: string, body: string) {
  if (!isWhatsAppConfigured()) return { ok: false, error: 'WhatsApp provider is not configured.' };
  const destination = toE164(to);
  if (destination.length < 10) return { ok: false, error: 'Borrower phone number is not valid.' };
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const payload = new URLSearchParams({
    From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    To: `whatsapp:${destination}`,
    Body: body,
  });
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload,
    });
    if (!response.ok) return { ok: false, error: await response.text() };
    const data = await response.json() as { sid?: string };
    return { ok: true, messageId: data.sid };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'WhatsApp delivery failed.' };
  }
}
