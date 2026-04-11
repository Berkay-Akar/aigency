import dns from 'node:dns';
import https from 'node:https';
import { URL } from 'node:url';
import { NodeHttpHandler } from '@smithy/node-http-handler';

/**
 * Prefer IPv4 for outbound HTTPS. Some networks break TLS (alert 40) over IPv6
 * to CDNs (fal.media, R2, etc.).
 */
export const httpsAgentIpv4 = new https.Agent({
  keepAlive: true,
  lookup(hostname, options, callback) {
    dns.lookup(hostname, { ...options, family: 4 }, callback);
  },
});

export const awsRequestHandlerIpv4 = new NodeHttpHandler({
  httpsAgent: httpsAgentIpv4,
});

/**
 * GET an HTTPS URL into a buffer (fal result URLs). Uses IPv4-preferring agent.
 */
export async function fetchHttpsBuffer(
  urlString: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const url = new URL(urlString);
  if (url.protocol !== 'https:') {
    throw new Error(`fetchHttpsBuffer: only https URLs supported, got ${url.protocol}`);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        agent: httpsAgentIpv4,
        headers: { 'User-Agent': 'aigencys-worker/1' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const contentType =
            (typeof res.headers['content-type'] === 'string'
              ? res.headers['content-type'].split(';')[0]
              : undefined) ?? 'application/octet-stream';
          resolve({
            buffer: Buffer.concat(chunks),
            contentType,
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}
