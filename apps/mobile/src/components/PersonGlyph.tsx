import Svg, { Path } from 'react-native-svg';

export type PersonGlyphProps = { size: number; color: string; strokeWidth: number };

/** A head-and-shoulders outline, shown where there is no name to take initials from (`I.person` in the mockup). */
export function PersonGlyph({ size, color, strokeWidth }: PersonGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
