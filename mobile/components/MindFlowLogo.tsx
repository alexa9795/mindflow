import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { G, Path, Circle, Mask, Rect, ClipPath, Defs } from 'react-native-svg';

/**
 * MindFlow mark — a profile head with a halftone "stream of consciousness"
 * flowing in and dissolving to negative space within the mind. Single flat
 * color; the holes are true transparency, so it works on any background.
 *
 * Authoring coordinates are in a 0–100 space; the mark's content bounding box
 * is x:[1.4, 66.0] y:[20.0, 87.0], so the viewBox is tightened to that box to
 * remove dead space (the mark sits inline next to the wordmark).
 */
const HEAD_PATH =
  'M 43 87 L 43 69 C 35 68, 30 63, 29 54 C 24 52, 23 43, 28 34 C 35 24, 47 20, 57 27 C 62 31, 62 39, 58 44 L 65 51 C 66 53, 64 55, 59 56 C 56 57, 56 60, 58 63 C 60 66, 58 69, 53 71 C 50 72, 49 75, 49 87 Z';

interface Dot {
  x: number;
  y: number;
  r: number;
}

const DOTS: Dot[] = [{"x":2,"y":34,"r":0.6},{"x":4.82,"y":34.62,"r":0.79},{"x":7.64,"y":35.19,"r":0.97},{"x":10.45,"y":35.66,"r":1.14},{"x":13.27,"y":36,"r":1.3},{"x":16.09,"y":36.18,"r":1.45},{"x":18.91,"y":36.18,"r":1.58},{"x":21.73,"y":36,"r":1.69},{"x":24.55,"y":35.66,"r":1.78},{"x":27.36,"y":35.19,"r":1.85},{"x":30.18,"y":34.62,"r":1.89},{"x":33,"y":34,"r":1.9},{"x":35.82,"y":33.38,"r":1.89},{"x":38.64,"y":32.81,"r":1.85},{"x":41.45,"y":32.34,"r":1.78},{"x":44.27,"y":32,"r":1.69},{"x":47.09,"y":31.82,"r":1.58},{"x":49.91,"y":31.82,"r":1.45},{"x":52.73,"y":32,"r":1.3},{"x":55.55,"y":32.34,"r":1.14},{"x":58.36,"y":32.81,"r":0.97},{"x":61.18,"y":33.38,"r":0.79},{"x":64,"y":34,"r":0.6},{"x":2,"y":44.42,"r":0.6},{"x":4.82,"y":44.83,"r":0.79},{"x":7.64,"y":45.1,"r":0.97},{"x":10.45,"y":45.2,"r":1.14},{"x":13.27,"y":45.12,"r":1.3},{"x":16.09,"y":44.87,"r":1.45},{"x":18.91,"y":44.46,"r":1.58},{"x":21.73,"y":43.94,"r":1.69},{"x":24.55,"y":43.34,"r":1.78},{"x":27.36,"y":42.72,"r":1.85},{"x":30.18,"y":42.11,"r":1.89},{"x":33,"y":41.58,"r":1.9},{"x":35.82,"y":41.17,"r":1.89},{"x":38.64,"y":40.9,"r":1.85},{"x":41.45,"y":40.8,"r":1.78},{"x":44.27,"y":40.88,"r":1.69},{"x":47.09,"y":41.13,"r":1.58},{"x":49.91,"y":41.54,"r":1.45},{"x":52.73,"y":42.06,"r":1.3},{"x":55.55,"y":42.66,"r":1.14},{"x":58.36,"y":43.28,"r":0.97},{"x":61.18,"y":43.89,"r":0.79},{"x":64,"y":44.42,"r":0.6},{"x":2,"y":53.17,"r":0.6},{"x":4.82,"y":53.19,"r":0.79},{"x":7.64,"y":53.03,"r":0.97},{"x":10.45,"y":52.7,"r":1.14},{"x":13.27,"y":52.24,"r":1.3},{"x":16.09,"y":51.68,"r":1.45},{"x":18.91,"y":51.06,"r":1.58},{"x":21.73,"y":50.44,"r":1.69},{"x":24.55,"y":49.86,"r":1.78},{"x":27.36,"y":49.38,"r":1.85},{"x":30.18,"y":49.03,"r":1.89},{"x":33,"y":48.83,"r":1.9},{"x":35.82,"y":48.81,"r":1.89},{"x":38.64,"y":48.97,"r":1.85},{"x":41.45,"y":49.3,"r":1.78},{"x":44.27,"y":49.76,"r":1.69},{"x":47.09,"y":50.32,"r":1.58},{"x":49.91,"y":50.94,"r":1.45},{"x":52.73,"y":51.56,"r":1.3},{"x":55.55,"y":52.14,"r":1.14},{"x":58.36,"y":52.62,"r":0.97},{"x":61.18,"y":52.97,"r":0.79},{"x":64,"y":53.17,"r":0.6},{"x":2,"y":61.9,"r":0.6},{"x":4.82,"y":61.51,"r":0.79},{"x":7.64,"y":61,"r":0.97},{"x":10.45,"y":60.4,"r":1.14},{"x":13.27,"y":59.78,"r":1.3},{"x":16.09,"y":59.17,"r":1.45},{"x":18.91,"y":58.63,"r":1.58},{"x":21.73,"y":58.2,"r":1.69},{"x":24.55,"y":57.92,"r":1.78},{"x":27.36,"y":57.8,"r":1.85},{"x":30.18,"y":57.86,"r":1.89},{"x":33,"y":58.1,"r":1.9},{"x":35.82,"y":58.49,"r":1.89},{"x":38.64,"y":59,"r":1.85},{"x":41.45,"y":59.6,"r":1.78},{"x":44.27,"y":60.22,"r":1.69},{"x":47.09,"y":60.83,"r":1.58},{"x":49.91,"y":61.37,"r":1.45},{"x":52.73,"y":61.8,"r":1.3},{"x":55.55,"y":62.08,"r":1.14},{"x":58.36,"y":62.2,"r":0.97},{"x":61.18,"y":62.14,"r":0.79},{"x":64,"y":61.9,"r":0.6}];

// Tightened content bounding box (see note above).
const VB = { x: 1.4, y: 20, w: 64.6, h: 67 };
const ASPECT = VB.w / VB.h; // ~0.964

export interface MindFlowMarkProps {
  /** Rendered height in px; width follows the mark's aspect ratio. */
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function MindFlowMark({ height = 48, color = '#2C2418', style }: MindFlowMarkProps) {
  return (
    <Svg
      width={height * ASPECT}
      height={height}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      style={style}
    >
      <Defs>
        <ClipPath id="mf-head">
          <Path d={HEAD_PATH} />
        </ClipPath>
        {/* White = keep, black = punch a hole. Dots inside the head become
            negative space; dots outside it stay solid (the flowing stream). */}
        <Mask id="mf-mask" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">
          <Rect x="-50" y="-50" width="200" height="200" fill="white" />
          <G clipPath="url(#mf-head)">
            {DOTS.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill="black" />
            ))}
          </G>
        </Mask>
      </Defs>
      <G fill={color} mask="url(#mf-mask)">
        {DOTS.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} />
        ))}
        <Path d={HEAD_PATH} />
      </G>
    </Svg>
  );
}

export interface MindFlowLogoProps {
  color: string;
  /** Height of the mark in px. */
  height?: number;
  /** Render only the mark — omit the "MindFlow" wordmark. */
  hideText?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Horizontal lockup: mark + "MindFlow" wordmark. With `hideText` only the mark
 * renders (the screens draw their own wordmark next to it). The wordmark uses
 * PlayfairDisplay_700Bold, which is loaded in app/_layout.tsx.
 */
export default function MindFlowLogo({
  color,
  height = 40,
  hideText = false,
  style,
}: MindFlowLogoProps) {
  if (hideText) {
    return <MindFlowMark height={height} color={color} style={style} />;
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <MindFlowMark height={height} color={color} />
      <Text
        style={{
          marginLeft: height * 0.34,
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: height * 0.72,
          color,
          letterSpacing: 0.3,
        }}
      >
        MindFlow
      </Text>
    </View>
  );
}
