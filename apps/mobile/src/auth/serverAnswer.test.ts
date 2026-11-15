import { answerFrom } from './serverAnswer.ts';

describe('answerFrom', () => {
  it('maps no error to ok, 429 to rate-limited, other 4xx to refused and anything else to error', () => {
    expect(answerFrom({ error: null })).toEqual({ status: 'ok' });
    expect(answerFrom({ error: { status: 429 } })).toEqual({ status: 'rate-limited' });
    expect(answerFrom({ error: { status: 400 } })).toEqual({ status: 'refused' });
    expect(answerFrom({ error: { status: 403 } })).toEqual({ status: 'refused' });
    expect(answerFrom({ error: { status: 500 } })).toEqual({ status: 'error' });
  });
});
