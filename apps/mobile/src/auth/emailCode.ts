import { EMAIL_CODE_LENGTH } from '@compound/contracts';
import { z } from 'zod';

import type { ServerAnswer } from './serverAnswer.ts';

export type EmailCodeDeps = {
  sendCode: (email: string) => Promise<ServerAnswer>;
  verifyCode: (email: string, code: string) => Promise<ServerAnswer>;
};

export type RequestOutcome =
  | { kind: 'sent'; email: string }
  | { kind: 'invalid-email' }
  | { kind: 'rate-limited' }
  | { kind: 'failed' };

export type VerifyOutcome = { kind: 'signed-in' } | { kind: 'refused' } | { kind: 'rate-limited' } | { kind: 'failed' };

const Email = z.email();
const Code = z.string().length(EMAIL_CODE_LENGTH).regex(/^[0-9]+$/);

export async function requestEmailCode({
  sendCode,
  email,
}: Pick<EmailCodeDeps, 'sendCode'> & { email: string }): Promise<RequestOutcome> {
  const parsed = Email.safeParse(email.trim().toLowerCase());

  if (!parsed.success) {
    return { kind: 'invalid-email' };
  }

  try {
    const answer = await sendCode(parsed.data);

    switch (answer.status) {
      case 'ok':
        return { kind: 'sent', email: parsed.data };
      case 'rate-limited':
        return { kind: 'rate-limited' };
      case 'refused':
      case 'error':
        return { kind: 'failed' };
      default: {
        const _exhaustive: never = answer;

        return _exhaustive;
      }
    }
  } catch {
    return { kind: 'failed' };
  }
}

export async function verifyEmailCode({
  verifyCode,
  email,
  code,
}: Pick<EmailCodeDeps, 'verifyCode'> & { email: string; code: string }): Promise<VerifyOutcome> {
  const parsed = Code.safeParse(code.trim());

  if (!parsed.success) {
    return { kind: 'refused' };
  }

  try {
    const answer = await verifyCode(email, parsed.data);

    switch (answer.status) {
      case 'ok':
        return { kind: 'signed-in' };
      case 'refused':
        return { kind: 'refused' };
      case 'rate-limited':
        return { kind: 'rate-limited' };
      case 'error':
        return { kind: 'failed' };
      default: {
        const _exhaustive: never = answer;

        return _exhaustive;
      }
    }
  } catch {
    return { kind: 'failed' };
  }
}
