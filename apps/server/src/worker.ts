import { DeleteMessageCommand, ReceiveMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';

import { handleTick, parseTick, type TickLogger } from './ticks.ts';

export type WorkerLogger = TickLogger & {
  error: (fields: { error: string }, message: string) => void;
};

export type TickWorkerOptions = {
  sqs: SQSClient;
  queueUrl: string;
  logger: WorkerLogger;
};

const RETRY_DELAY_MS = 1000;
const LONG_POLL_SECONDS = 1;

export function startTickWorker({ sqs, queueUrl, logger }: TickWorkerOptions) {
  const controller = new AbortController();
  const { signal } = controller;

  async function poll(): Promise<void> {
    const { Messages: messages = [] } = await sqs.send(
      new ReceiveMessageCommand({ QueueUrl: queueUrl, WaitTimeSeconds: LONG_POLL_SECONDS, MaxNumberOfMessages: 10 }),
      { abortSignal: signal },
    );

    for (const message of messages) {
      try {
        handleTick(parseTick(message.Body ?? ''), logger);
        await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
      } catch (error) {
        // Left undeleted on purpose: the queue redelivers it, then moves it to the dead-letter queue.
        logger.error({ error: String(error) }, 'tick not handled');
      }
    }
  }

  async function run(): Promise<void> {
    while (!signal.aborted) {
      try {
        await poll();
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        logger.error({ error: String(error) }, 'tick queue not readable');
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  const finished = run();

  return {
    stop: async () => {
      controller.abort();
      await finished;
    },
  };
}
