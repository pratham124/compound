import { requestEmailCode, verifyEmailCode, type EmailCodeDeps } from './emailCode.ts';

function deps(overrides: Partial<EmailCodeDeps> = {}): EmailCodeDeps {
  return {
    sendCode: async () => ({ status: 'ok' }),
    verifyCode: async () => ({ status: 'ok' }),
    ...overrides,
  };
}

describe('requestEmailCode', () => {
  it('asks the server to email a code to the trimmed, lower-cased address', async () => {
    const sendCode = jest.fn<ReturnType<EmailCodeDeps['sendCode']>, [string]>(async () => ({ status: 'ok' }));

    const outcome = await requestEmailCode({ ...deps({ sendCode }), email: '  Pratham@Example.COM ' });

    expect(outcome).toEqual({ kind: 'sent', email: 'pratham@example.com' });
    expect(sendCode).toHaveBeenCalledWith('pratham@example.com');
  });

  it('rejects an address without an @ and domain without calling the server', async () => {
    const sendCode = jest.fn<ReturnType<EmailCodeDeps['sendCode']>, [string]>(async () => ({ status: 'ok' }));

    const outcome = await requestEmailCode({ ...deps({ sendCode }), email: 'pratham' });

    expect(outcome).toEqual({ kind: 'invalid-email' });
    expect(sendCode).not.toHaveBeenCalled();
  });

  it('reports rate-limited when the server asks the phone to slow down', async () => {
    const outcome = await requestEmailCode({
      ...deps({ sendCode: async () => ({ status: 'rate-limited' }) }),
      email: 'a@b.co',
    });

    expect(outcome).toEqual({ kind: 'rate-limited' });
  });

  it('reports failed when the server errors or cannot be reached', async () => {
    const down = deps({
      sendCode: async () => {
        throw new TypeError('Network request failed');
      },
    });

    expect(await requestEmailCode({ ...deps({ sendCode: async () => ({ status: 'error' }) }), email: 'a@b.co' })).toEqual({
      kind: 'failed',
    });
    expect(await requestEmailCode({ ...down, email: 'a@b.co' })).toEqual({ kind: 'failed' });
  });
});

describe('verifyEmailCode', () => {
  it('signs in when the server accepts the code', async () => {
    const verifyCode = jest.fn<ReturnType<EmailCodeDeps['verifyCode']>, [string, string]>(async () => ({ status: 'ok' }));

    const outcome = await verifyEmailCode({ ...deps({ verifyCode }), email: 'a@b.co', code: '123456' });

    expect(outcome).toEqual({ kind: 'signed-in' });
    expect(verifyCode).toHaveBeenCalledWith('a@b.co', '123456');
  });

  it('reports refused when the server refuses the code, as it does for a wrong, expired or used code', async () => {
    const outcome = await verifyEmailCode({
      ...deps({ verifyCode: async () => ({ status: 'refused' }) }),
      email: 'a@b.co',
      code: '123456',
    });

    expect(outcome).toEqual({ kind: 'refused' });
  });

  it('reports rate-limited, not a wrong code, when the server asks the phone to slow down', async () => {
    const outcome = await verifyEmailCode({
      ...deps({ verifyCode: async () => ({ status: 'rate-limited' }) }),
      email: 'a@b.co',
      code: '123456',
    });

    expect(outcome).toEqual({ kind: 'rate-limited' });
  });

  it('reports refused without calling the server when the code is not six digits', async () => {
    const verifyCode = jest.fn<ReturnType<EmailCodeDeps['verifyCode']>, [string, string]>(async () => ({ status: 'ok' }));

    const outcome = await verifyEmailCode({ ...deps({ verifyCode }), email: 'a@b.co', code: '12345' });

    expect(outcome).toEqual({ kind: 'refused' });
    expect(verifyCode).not.toHaveBeenCalled();
  });

  it('reports failed when the server errors or cannot be reached', async () => {
    const down = deps({
      verifyCode: async () => {
        throw new TypeError('Network request failed');
      },
    });

    expect(await verifyEmailCode({ ...down, email: 'a@b.co', code: '123456' })).toEqual({ kind: 'failed' });
  });
});
