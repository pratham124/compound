import { buildApp } from './app.ts';
import { parseConfig } from './config.ts';
import { connect } from './connections.ts';
import { startTickWorker } from './worker.ts';

const config = parseConfig(process.env);
const connections = connect(config);

const app = buildApp({ logger: true, healthChecks: connections.healthChecks });

// The laptop runs the api and worker roles in one process (PRD section 12).
const worker = startTickWorker({ sqs: connections.sqs, queueUrl: connections.ticksQueueUrl, logger: app.log });

app.addHook('onClose', async () => {
  await worker.stop();
  await connections.close();
});

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
