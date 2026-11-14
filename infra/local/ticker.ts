import { buildTickBody } from './tick-body.ts';
import { parseIntervalSeconds } from './tick-interval.ts';

const endpoint = process.env.SQS_ENDPOINT ?? 'http://sqs:9324';
const queueName = process.env.TICKS_QUEUE_NAME ?? 'ticks';
const intervalSeconds = parseIntervalSeconds(process.env.TICK_INTERVAL_SECONDS);

async function sendTick(): Promise<void> {
  const body = new URLSearchParams({
    Action: 'SendMessage',
    Version: '2012-11-05',
    MessageBody: buildTickBody(new Date()),
  });

  const response = await fetch(`${endpoint}/000000000000/${queueName}`, { method: 'POST', body });

  if (!response.ok) {
    throw new Error(`SendMessage answered ${response.status}`);
  }
}

console.log(`ticker: sending a test tick to ${queueName} every ${intervalSeconds}s`);

async function tickOnce(): Promise<void> {
  try {
    await sendTick();
  } catch (error) {
    console.error('ticker: tick not sent', error);
  }
}

setInterval(() => void tickOnce(), intervalSeconds * 1000);
