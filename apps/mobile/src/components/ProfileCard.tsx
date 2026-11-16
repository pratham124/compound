import type { Units } from '@compound/contracts';
import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { noticeMotion } from '../motion/layoutAnimations.ts';
import type { ProfileState } from '../profile/useProfile.ts';
import { blob, layout, radius, space, type, type Palette } from '../theme/tokens.ts';
import { PressScale } from './PressScale.tsx';
import { Blob } from './Blob.tsx';
import { GLOBE_ICON, SCALE_ICON } from './blobIcons.ts';
import { SegmentedControl, type SegmentOption } from './SegmentedControl.tsx';

export type ProfileCardProps = {
  palette: Palette;
  state: ProfileState;
  onChooseUnits: (units: Units) => void;
  onRetry: () => void;
};

const UNIT_OPTIONS = [
  { value: 'metric', label: 'kg' },
  { value: 'imperial', label: 'lb' },
] as const satisfies readonly [SegmentOption<Units>, SegmentOption<Units>];

type RowProps = {
  lead?: ReactNode;
  label: string;
  palette: Palette;
  /** At larger text sizes the trailing part drops under the label instead of squeezing beside it. */
  stacked: boolean;
  /** True for a text value that should take what room is left and be cut off; false for a fixed-size control. */
  trailFills: boolean;
  children: ReactNode;
};

/** One row of a list group (`.lrow` in the mockup): label on the left, a value or control on the right. */
function Row({ lead, label, palette, stacked, trailFills, children }: RowProps) {
  return (
    <View testID={`row-${label}`} style={[styles.row, stacked ? styles.rowStacked : null]}>
      <View style={[styles.labelGroup, trailFills ? styles.labelFixed : null]}>
        {lead}
        <Text style={[type.body, styles.labelText, { color: palette.label }]}>{label}</Text>
      </View>
      <View
        testID={`trail-${label}`}
        style={[
          trailFills ? styles.trailFills : styles.trailFixed,
          stacked ? [styles.trailStacked, lead === undefined ? null : { paddingLeft: blob.width + space.md }] : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Body({ palette, state, onChooseUnits, onRetry }: ProfileCardProps) {
  const { entering, exiting } = noticeMotion();
  const stacked = useWindowDimensions().fontScale >= layout.largerTextFrom;

  switch (state.kind) {
    case 'loading':
      return <Text style={[type.subheadline, styles.message, { color: palette.secondary }]}>Loading your profile…</Text>;
    case 'failed':
      return (
        <>
          <Text style={[type.subheadline, styles.message, { color: palette.secondary }]}>
            Couldn't load your profile. Check your connection and try again.
          </Text>
          <PressScale
            accessibilityRole="button"
            onPress={onRetry}
            style={[styles.button, { backgroundColor: palette.accentSoft }]}
          >
            <Text style={[type.callout, { color: palette.accent }]}>Try again</Text>
          </PressScale>
        </>
      );
    case 'ready': {
      const saving = state.save.kind === 'saving';
      const shownUnits = state.save.kind === 'saving' ? state.save.units : state.profile.units;

      return (
        <Animated.View entering={entering} style={styles.group}>
          <Row lead={<Blob tint={palette.charBlob} stroke={palette.accent} iconPath={SCALE_ICON} />} label="Units" palette={palette} stacked={stacked} trailFills={false}>
            <SegmentedControl
              palette={palette}
              label="Units"
              options={UNIT_OPTIONS}
              selected={shownUnits}
              disabled={saving}
              onChoose={onChooseUnits}
            />
          </Row>
          <Row
            lead={<Blob tint={palette.charBlob} stroke={palette.accent} iconPath={GLOBE_ICON} />}
            label="Time Zone"
            palette={palette}
            stacked={stacked}
            trailFills
          >
            <Text
              ellipsizeMode="tail"
              numberOfLines={1}
              style={[type.subheadline, { color: palette.secondary, textAlign: stacked ? 'left' : 'right' }]}
            >
              {state.profile.timeZone.replaceAll('_', ' ')}
            </Text>
          </Row>
          {state.save.kind === 'failed' ? (
            <Animated.Text
              accessibilityRole="alert"
              entering={entering}
              exiting={exiting}
              style={[type.subheadline, styles.message, { color: palette.danger }]}
            >
              Couldn't save that. Check your connection and try again.
            </Animated.Text>
          ) : null}
        </Animated.View>
      );
    }

    default: {
      const _exhaustive: never = state;

      return _exhaustive;
    }
  }
}

/** One shell for every state, so the group grows to its content instead of being swapped for a different one. */
export function ProfileCard(props: ProfileCardProps) {
  const { layout: slide } = noticeMotion();

  return (
    <Animated.View layout={slide} style={[styles.card, styles.group, { backgroundColor: props.palette.card }]}>
      <Body {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: radius.card, overflow: 'hidden', padding: space.sm },
  group: { gap: layout.groupGap },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouch,
    paddingVertical: space.sm,
    paddingHorizontal: 10,
    borderRadius: radius.row,
  },
  rowStacked: { flexDirection: 'column', alignItems: 'stretch' },
  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1, flexGrow: 1, paddingVertical: space.xxs },
  labelFixed: { flexShrink: 0, flexGrow: 0 },
  labelText: { flexShrink: 1 },
  trailFixed: { flexShrink: 0, marginLeft: space.md },
  trailFills: { flexShrink: 1, flexGrow: 1, marginLeft: space.md },
  trailStacked: { marginLeft: 0 },
  message: { paddingVertical: space.sm, paddingHorizontal: 10 },
  button: {
    minHeight: layout.minTouch,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
});
