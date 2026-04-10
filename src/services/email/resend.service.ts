import { env, isResendConfigured } from '../../config/env';

export async function sendWorkspaceInviteEmail(input: {
  to: string;
  workspaceName: string;
  inviteLink: string;
  role: 'OWNER' | 'MEMBER';
}): Promise<void> {
  if (!isResendConfigured()) {
    throw Object.assign(
      new Error('Resend is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)'),
      { statusCode: 503 },
    );
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.to],
      subject: `You're invited to ${input.workspaceName}`,
      html: `<p>You were invited as <strong>${input.role}</strong> to <strong>${input.workspaceName}</strong>.</p>
             <p>Complete your account setup:</p>
             <p><a href="${input.inviteLink}">${input.inviteLink}</a></p>
             <p>This link is one-time use and expires in 48 hours.</p>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw Object.assign(new Error(`Resend API failed: ${text}`), { statusCode: 502 });
  }
}
