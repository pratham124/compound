import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { CreateQueueCommand, DeleteQueueCommand, SendMessageCommand } from '@aws-sdk/client-sqs';

import { buildTickBody } from '../../../infra/local/tick-body.ts';
import { parseConfig } from './config.ts';
import { connect } from './connections.ts';
import type { Tick } from './ticks.ts';
import { startTickWorker } from './worker.ts';

/** These run against the Compose stack: `pnpm stack:up` first (CI does the same). */
const config = parseConfig(process.env);

async function scratchQueue(t: test.TestContext, visibilityTimeoutSeconds: number) {
  const connections = connect(config);

  t.after(() => connections.close());

  const { QueueUrl: queueUrl = '' } = await connections.sqs
    .send(
      new CreateQueueCommand({
        QueueName: `worker-test-${randomUUID()}`,
        Attributes: { VisibilityTimeout: String(visibilityTimeoutSeconds) },
      }),
    )
    .catch((error) => {
      throw new Error('The Compose stack is not reachable. Run pnpm stack:up first.', { cause: error });
    });

  t.after(() => connections.sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl })));

  const received: Tick[] = [];
  const errors: string[] = [];

  const start = () => {
    const worker = startTickWorker({
      sqs: connections.sqs,
      queueUrl,
      logger: {
        info: ({ tick }) => received.push(tick),
        error: (_fields, message) => errors.push(message),
      },
    });

    t.after(() => worker.stop());
  };

  const send = (body: string) => connections.sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: body }));

  return { send, start, received, errors };
}

async function until(condition: () => boolean) {
  for (let waited = 0; !condition() && waited < 10_000; waited += 100) {
    await sleep(100);
  }
}

test('a worker handler logs the test tick the ticker sends', async (t) => {
  const { send, start, received } = await scratchQueue(t, 30);
  const sentAt = new Date('2026-11-13T09:30:00.000Z');

  start();
  await send(buildTickBody(sentAt));
  await until(() => received.length > 0);

  assert.deepEqual(received, [{ kind: 'test', sentAt: '2026-11-13T09:30:00.000Z' }]);
});

test('a message that is not a tick is reported and does not block the ticks batched with it', async (t) => {
  const { send, start, received, errors } = await scratchQueue(t, 30);

  await send('not json');
  await send(buildTickBody(new Date('2026-11-13T09:31:00.000Z')));
  start();
  await until(() => received.length > 0);

  assert.equal(received.length, 1);
  assert.deepEqual(errors, ['tick not handled']);
});

test('a handled tick is deleted, so the queue does not deliver it again', async (t) => {
  const { send, start, received } = await scratchQueue(t, 1);

  start();
  await send(buildTickBody(new Date('2026-11-13T09:32:00.000Z')));
  await until(() => received.length > 0);
  await sleep(2500);

  assert.equal(received.length, 1);
});
