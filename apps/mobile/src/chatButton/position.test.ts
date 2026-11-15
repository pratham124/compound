import { chatButton, layout } from '../theme/tokens.ts';
import { defaultPosition, positionFromRelease, restingPoint, type ScreenBox } from './position.ts';

const phone: ScreenBox = { width: 390, height: 844, insetTop: 47, insetBottom: 34 };
const phoneWithHomeButton: ScreenBox = { width: 375, height: 667, insetTop: 20, insetBottom: 0 };
const bigPhone: ScreenBox = { width: 430, height: 932, insetTop: 59, insetBottom: 34 };

describe('positionFromRelease', () => {
  it('snaps to the left edge when released left of the middle', () => {
    expect(positionFromRelease({ centerX: 150, centerY: 400 }, phone).edge).toBe('left');
  });

  it('snaps to the right edge when released right of the middle', () => {
    expect(positionFromRelease({ centerX: 250, centerY: 400 }, phone).edge).toBe('right');
  });

  it('stores height as a fraction of the screen height', () => {
    expect(positionFromRelease({ centerX: 300, centerY: 422 }, phone).fraction).toBeCloseTo(0.5);
  });

  it('keeps the button below the status bar when released above it', () => {
    const { fraction } = positionFromRelease({ centerX: 300, centerY: 0 }, phone);
    const { y } = restingPoint({ edge: 'right', fraction }, phone);

    expect(y).toBe(phone.insetTop + chatButton.edgeGap);
  });

  it('keeps the button above the tab bar when released over it', () => {
    const { fraction } = positionFromRelease({ centerX: 300, centerY: 840 }, phone);
    const { y } = restingPoint({ edge: 'right', fraction }, phone);

    expect(y + chatButton.touch).toBe(phone.height - phone.insetBottom - layout.tabBarHeight - chatButton.edgeGap);
  });
});

describe('restingPoint', () => {
  it('puts a right-edge button an edge gap in from the right of any screen width', () => {
    const position = { edge: 'right', fraction: 0.5 } as const;

    expect(restingPoint(position, phone).x).toBe(390 - chatButton.edgeGap - chatButton.touch);
    expect(restingPoint(position, bigPhone).x).toBe(430 - chatButton.edgeGap - chatButton.touch);
  });

  it('puts a left-edge button an edge gap in from the left', () => {
    expect(restingPoint({ edge: 'left', fraction: 0.5 }, phone).x).toBe(chatButton.edgeGap);
  });

  it('returns to the same relative height on a taller screen', () => {
    const position = { edge: 'right', fraction: 0.4 } as const;
    const onPhone = restingPoint(position, phone).y + chatButton.touch / 2;
    const onBigPhone = restingPoint(position, bigPhone).y + chatButton.touch / 2;

    expect(onPhone / phone.height).toBeCloseTo(0.4);
    expect(onBigPhone / bigPhone.height).toBeCloseTo(0.4);
  });
});

describe('on a phone with no home indicator', () => {
  it('still keeps the button above the tab bar, which floats tabBarBottom above the screen bottom', () => {
    const { y } = restingPoint(defaultPosition, phoneWithHomeButton);
    const tabBarTop = phoneWithHomeButton.height - layout.tabBarBottom - layout.tabBarHeight;

    expect(y + chatButton.touch).toBe(tabBarTop - chatButton.edgeGap);
  });
});

describe('defaultPosition', () => {
  it('starts on the right edge, just above the tab bar', () => {
    const { x, y } = restingPoint(defaultPosition, phone);

    expect(defaultPosition.edge).toBe('right');
    expect(x).toBe(390 - chatButton.edgeGap - chatButton.touch);
    expect(y + chatButton.touch).toBe(phone.height - phone.insetBottom - layout.tabBarHeight - chatButton.edgeGap);
  });
});
