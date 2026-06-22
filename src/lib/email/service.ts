/**
 * Email notification service for LEJ Capital.
 *
 * Uses Resend (https://resend.com) when RESEND_API_KEY is set.
 * Falls back to console logging in development/seed mode.
 *
 * To enable: set RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local
 */

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function isConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'LEJ Capital <noreply@lejcapital.com>';

async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (!isConfigured()) {
    console.log('[EMAIL] Would send:', { to: payload.to, subject: payload.subject });
    return { ok: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[EMAIL] Send failed:', error);
      return { ok: false, error };
    }

    const data = await response.json();
    return { ok: true, messageId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EMAIL] Send error:', message);
    return { ok: false, error: message };
  }
}

// ── Email templates ──

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f6f7f8;font-family:Inter,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#052b57;">LEJ Capital</h1>
    <p style="margin:4px 0 0;font-size:11px;color:#66707c;text-transform:uppercase;letter-spacing:1px;">Capital Management System</p>
  </div>
  <div style="background:#ffffff;border:1px solid #e4e7eb;border-radius:8px;padding:24px;margin-bottom:24px;">
    ${content}
  </div>
  <div style="text-align:center;">
    <p style="font-size:11px;color:#66707c;margin:0;">This is an automated notification from LEJ Capital Management.</p>
    <p style="font-size:11px;color:#66707c;margin:4px 0 0;">Do not reply to this email.</p>
  </div>
</div>
</body>
</html>`;
}

export async function sendPCRAlert(email: string, pcr: string, status: string): Promise<SendResult> {
  const statusColor = status === 'GREEN' ? '#059669' : status === 'WATCH' ? '#d97706' : '#dc2626';
  return sendEmail({
    to: email,
    subject: `[LEJ Capital] PCR Alert: ${pcr}x (${status})`,
    html: baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:16px;color:#030504;">Protection Cover Ratio Alert</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#2f343b;">The fund's PCR has changed to a new status level.</p>
      <div style="background:#f6f7f8;border-radius:6px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#030504;">${pcr}x</p>
        <p style="margin:8px 0 0;font-size:12px;font-weight:600;color:${statusColor};text-transform:uppercase;">${status}</p>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#66707c;">Target band: 1.15x - 1.25x. Review the risk dashboard for details.</p>
    `),
  });
}

export async function sendCycleTransition(email: string, cycleNo: number, fromStatus: string, toStatus: string): Promise<SendResult> {
  return sendEmail({
    to: email,
    subject: `[LEJ Capital] Cycle ${cycleNo}: ${fromStatus} → ${toStatus}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:16px;color:#030504;">Cycle Transition</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#2f343b;">Cycle ${cycleNo} has been transitioned.</p>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:#f6f7f8;border-radius:6px;text-align:center;">
        <span style="font-size:14px;font-weight:600;color:#66707c;">${fromStatus}</span>
        <span style="font-size:18px;color:#052b57;">→</span>
        <span style="font-size:14px;font-weight:700;color:#052b57;">${toStatus}</span>
      </div>
    `),
  });
}

export async function sendLoanOverdueAlert(email: string, borrowerName: string, daysPastDue: number, amount: string): Promise<SendResult> {
  return sendEmail({
    to: email,
    subject: `[LEJ Capital] Loan Overdue: ${borrowerName} (${daysPastDue} days)`,
    html: baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:16px;color:#030504;">Loan Payment Overdue</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#2f343b;">A loan payment is past due and requires attention.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#66707c;">Borrower</td><td style="padding:8px 0;font-weight:600;text-align:right;">${borrowerName}</td></tr>
        <tr><td style="padding:8px 0;color:#66707c;border-top:1px solid #e4e7eb;">Days past due</td><td style="padding:8px 0;font-weight:600;text-align:right;color:${daysPastDue > 90 ? '#dc2626' : '#d97706'};border-top:1px solid #e4e7eb;">${daysPastDue} days</td></tr>
        <tr><td style="padding:8px 0;color:#66707c;border-top:1px solid #e4e7eb;">Amount due</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${amount}</td></tr>
      </table>
    `),
  });
}

export async function sendMonthlyReport(email: string, data: {
  date: string;
  nav: string;
  pcr: string;
  pcrStatus: string;
  totalInvestors: number;
  riskBreaches: number;
}): Promise<SendResult> {
  return sendEmail({
    to: email,
    subject: `[LEJ Capital] Monthly Report — ${data.date}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:16px;color:#030504;">Monthly Fund Report</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#2f343b;">Snapshot as of ${data.date}.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:10px 0;color:#66707c;">Net Asset Value</td><td style="padding:10px 0;font-weight:700;font-size:16px;text-align:right;color:#052b57;">${data.nav}</td></tr>
        <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">PCR</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${data.pcr} (${data.pcrStatus})</td></tr>
        <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Active partners</td><td style="padding:10px 0;font-weight:600;text-align:right;border-top:1px solid #e4e7eb;">${data.totalInvestors}</td></tr>
        <tr><td style="padding:10px 0;color:#66707c;border-top:1px solid #e4e7eb;">Risk breaches</td><td style="padding:10px 0;font-weight:600;text-align:right;color:${data.riskBreaches > 0 ? '#dc2626' : '#059669'};border-top:1px solid #e4e7eb;">${data.riskBreaches}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#66707c;">Log in to the LEJ Capital dashboard for the full report.</p>
    `),
  });
}

export async function sendDailyOperatingBrief(email: string, data: {
  date: string;
  items: string[];
}): Promise<SendResult> {
  const list = data.items.length > 0
    ? `<ul style="margin:0;padding-left:18px;color:#2f343b;font-size:13px;line-height:1.6;">${data.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '<p style="margin:0;font-size:13px;color:#2f343b;">No new operating alerts were generated today.</p>';
  return sendEmail({
    to: email,
    subject: `[LEJ Capital] Daily operating brief — ${data.date}`,
    html: baseTemplate(`
      <h2 style="margin:0 0 12px;font-size:16px;color:#030504;">Daily operating brief</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#66707c;">Items that need management attention as of ${data.date}.</p>
      ${list}
    `),
  });
}

export async function sendBorrowerLoanEmail(email: string, subject: string, message: string): Promise<SendResult> {
  return sendEmail({
    to: email,
    subject,
    html: baseTemplate(`<p style="margin:0;white-space:pre-line;font-size:14px;line-height:1.6;color:#2f343b;">${message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>`),
    text: message,
  });
}

export { isConfigured as isEmailConfigured };
