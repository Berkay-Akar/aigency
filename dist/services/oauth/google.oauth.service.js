"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeGoogleAuthorizationCode = exchangeGoogleAuthorizationCode;
exports.fetchGoogleUserInfo = fetchGoogleUserInfo;
exports.buildGoogleAuthorizationUrl = buildGoogleAuthorizationUrl;
const env_1 = require("../../config/env");
async function exchangeGoogleAuthorizationCode(code) {
    const body = new URLSearchParams({
        client_id: env_1.env.GOOGLE_CLIENT_ID,
        client_secret: env_1.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: env_1.env.GOOGLE_REDIRECT_URI,
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    if (!res.ok) {
        const text = await res.text();
        throw Object.assign(new Error(`Google token exchange failed: ${res.status} ${text}`), { statusCode: 502 });
    }
    return res.json();
}
async function fetchGoogleUserInfo(accessToken) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        const text = await res.text();
        throw Object.assign(new Error(`Google userinfo failed: ${res.status} ${text}`), { statusCode: 502 });
    }
    return res.json();
}
function buildGoogleAuthorizationUrl(state) {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env_1.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', env_1.env.GOOGLE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    return url.toString();
}
//# sourceMappingURL=google.oauth.service.js.map