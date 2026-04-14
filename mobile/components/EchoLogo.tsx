import React from 'react';
import Svg, { Rect, Text } from 'react-native-svg';

export interface EchoLogoProps {
  color: string;
  width?: number;
  /** Render only the waveform bars — omit the "Echo" SVG text. */
  hideText?: boolean;
}

// Bar data encoding the phonetic shape of "love yourself".
// Each entry: [xOffset, height, opacity] relative to group start x=30.
// Double-bar "s" handled separately with explicit y positions.
const BARS: [number, number, number][] = [
  [0,  12, 0.30],  // l
  [7,  36, 0.90],  // o — open vowel peak
  [14, 24, 0.65],  // v
  [21, 16, 0.45],  // e
  [28,  4, 0.15],  // space/breath
  [35, 20, 0.50],  // y
  [42, 48, 1.00],  // ou — tallest bar, peak of "your"
  [49, 36, 0.85],  // r
  [63, 20, 0.55],  // e
  [70, 12, 0.38],  // l
  [77,  8, 0.22],  // f — fade
  [91,  6, 0.10],  // trailing silence
];

const BAR_WIDTH = 3.5;
const BAR_RX = 1.75;
const CENTER_Y = 26;
const GROUP_X = 30;

export default function EchoLogo({ color, width = 220, hideText = false }: EchoLogoProps) {
  // When hiding text, crop viewBox to the bars' actual bounding box (x=26–128)
  // trimming the ~30px of leading empty space so the row centres correctly.
  const viewBox = hideText ? '26 0 102 52' : '0 0 220 52';
  const svgWidth = hideText ? Math.round(width * 102 / 220) : width;
  const scale = svgWidth / (hideText ? 102 : 220);

  return (
    <Svg
      width={svgWidth}
      height={52 * scale}
      viewBox={viewBox}
    >
      {/* Regular bars */}
      {BARS.map(([xOff, h, op], i) => (
        <Rect
          key={i}
          x={GROUP_X + xOff}
          y={CENTER_Y - h / 2}
          width={BAR_WIDTH}
          height={h}
          rx={BAR_RX}
          fill={color}
          opacity={op}
        />
      ))}

      {/* Double-bar "s": upper bar y=7, lower bar y=30 */}
      <Rect
        x={GROUP_X + 56}
        y={7}
        width={BAR_WIDTH}
        height={10}
        rx={BAR_RX}
        fill={color}
        opacity={0.70}
      />
      <Rect
        x={GROUP_X + 56}
        y={30}
        width={BAR_WIDTH}
        height={10}
        rx={BAR_RX}
        fill={color}
        opacity={0.70}
      />

      {/* "Echo" wordmark — x = GROUP_X + 103 = 133 */}
      {!hideText && (
        <Text
          x={133}
          y={33}
          fontFamily="PlayfairDisplay_400Regular"
          fontSize={22}
          letterSpacing={2}
          fill={color}
        >
          Echo
        </Text>
      )}
    </Svg>
  );
}
