import { buildApp, SYNC_KINDS } from './app.ts';
import { parseConfig, type Config } from './config.ts';
import { connect } from './connections.ts';
import { createAuth } from './identity/auth.ts';
import { createConsoleMailer, type SignInCodeMailer } from './identity/mailer.ts';
import { migrate } from './identity/migrate.ts';
import { startTickWorker } from './worker.ts';

function mailerFor(kind: Config['signInMailer']): SignInCodeMailer {
  switch (kind) {
    case 'console':
      return createConsoleMailer((line) => process.stdout.write(`${line}\n`));
    default: {
      const _exhaustive: never = kind;

      return _exhaustive;
    }
  }
}

const config = parseConfig(process.env);
const connections = connect(config);

await migrate(connections.pool);

const auth = createAuth({
  pool: connections.authPool,
  valkey: connections.valkey,
  config,
  mailer: mailerFor(config.signInMailer),
});

const app = buildApp({ logger: true, healthChecks: connections.healthChecks, auth, apiPool: connections.apiPool, syncKinds: SYNC_KINDS });

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
