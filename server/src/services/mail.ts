import nodemailer from 'nodemailer';
import { config, mailEnabled } from '../config/index.js';

interface InviteMailOptions {
  to: string;
  inviteUrl: string;
  workspaceName: string;
  inviterName: string;
}

function transporter() {
  return nodemailer.createTransport({
    host: config.smtp.host ?? undefined,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user && config.smtp.pass
      ? { user: config.smtp.user, pass: config.smtp.pass }
      : undefined,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}

export async function sendInviteEmail(opts: InviteMailOptions): Promise<{ sent: boolean; error?: string }> {
  if (!mailEnabled) {
    return { sent: false, error: 'SMTP not configured' };
  }

  const title = `${escapeHtml(opts.inviterName)} invited you to ${escapeHtml(opts.workspaceName)} on ${config.appName}`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef0ec;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0ec;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(120deg,#0f766e,#0d9488 55%,#f97316);">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${config.appName}</div>
              <div style="font-size:13px;color:#cffafe;margin-top:4px;">The project workspace that thinks ahead</div>
            </td>
          </tr>
          <tr><td style="padding:28px 32px 8px;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;line-height:1.3;">You're invited to <span style="color:#0f766e;">${escapeHtml(opts.workspaceName)}</span></h1>
            <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(opts.inviterName)} invited you to collaborate on the ${escapeHtml(opts.workspaceName)} workspace. Boards, milestones, chat and an AI assistant are waiting.</p>
            <a href="${opts.inviteUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:14px;font-weight:700;padding:12px 22px;border-radius:10px;text-decoration:none;">Accept invitation</a>
            <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.6;">Or copy this link into your browser:<br /><span style="color:#0f766e;">${opts.inviteUrl}</span></p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    await transporter().sendMail({
      from: config.smtp.from,
      to: opts.to,
      subject: title,
      html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}