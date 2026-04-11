"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWorkspaceInviteEmail = sendWorkspaceInviteEmail;
const env_1 = require("../../config/env");
async function sendWorkspaceInviteEmail(input) {
    if (!(0, env_1.isResendConfigured)()) {
        throw Object.assign(new Error('Resend is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)'), { statusCode: 503 });
    }
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env_1.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env_1.env.RESEND_FROM_EMAIL,
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
//# sourceMappingURL=resend.service.js.map