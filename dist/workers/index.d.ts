import { Worker } from 'bullmq';
import './outbox.dispatcher';
import './social-token-refresh.worker';
import type { AiJobPayload, PublishJobPayload } from '../services/queue';
export declare const aiWorker: Worker<AiJobPayload, any, string>;
export declare const publishWorker: Worker<PublishJobPayload, any, string>;
//# sourceMappingURL=index.d.ts.map