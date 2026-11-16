import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { blob } from '../theme/tokens.ts';

export type BlobProps = {
  /** The blob's fill. */
  tint: string;
  /** The icon's stroke colour. */
  stroke: string;
  /** Path data for the icon, on a 24-point grid. */
  iconPath: string;
};

/** The soft faceless blob that leads a list row, with a stroked icon drawn in it (`.blob` in the mockup). */
export function Blob({ tint, stroke, iconPath }: BlobProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.blob}>
      <Svg width={blob.width} height={blob.height} viewBox="1.5 6 51 41" style={StyleSheet.absoluteFill}>
        <Path
          d="M27 7 C41 7 50.5 17.5 51.5 30 C52.3 40 46 46 27 46 C8 46 1.7 40 2.5 30 C3.5 17.5 13 7 27 7 Z"
          fill={tint}
        />
      </Svg>
      <Svg width={blob.icon} height={blob.icon} viewBox="0 0 24 24">
        <Path d={iconPath} fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { width: blob.width, height: blob.height, alignItems: 'center', justifyContent: 'center' },
});
