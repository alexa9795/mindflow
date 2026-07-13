import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { FONTS } from '../constants/fonts';
import { useSettings } from '../context/SettingsContext';

// Fixed English keys matching the backend's data payload (Postgres day names)
// — NOT user-facing, so not translated. The translated single-letter labels
// rendered under the chart come from common.weekdayInitials instead.
const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface MoodLineChartProps {
  /** Average mood (1–5) keyed by full weekday name. Missing days are gaps. */
  data: Record<string, number>;
  width: number;
}

const HEIGHT = 120;
const PAD_X = 14;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

/** Map a 1–5 mood score to a Y pixel (5 at top, 1 at bottom). */
function moodToY(score: number): number {
  const clamped = Math.max(1, Math.min(5, score));
  const t = (clamped - 1) / 4; // 0..1
  return PAD_TOP + (1 - t) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
}

/** Mood-over-the-week line chart. Presentation only — colours each point by its mood. */
export default function MoodLineChart({ data, width }: MoodLineChartProps) {
  const { theme } = useSettings();
  const { t } = useTranslation();
  const weekdayInitials = t('common.weekdayInitials', { returnObjects: true }) as string[];
  const innerW = width - PAD_X * 2;
  const step = innerW / (WEEKDAY_FULL.length - 1);

  const points = WEEKDAY_FULL.map((day, i) => {
    const score = data[day];
    return score != null
      ? { x: PAD_X + i * step, y: moodToY(score), score }
      : null;
  });

  const present = points.filter((p): p is { x: number; y: number; score: number } => p !== null);
  const polyline = present.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={HEIGHT}>
        {/* baseline + midline gridlines */}
        {[1, 3, 5].map((m) => (
          <Line
            key={m}
            x1={PAD_X}
            y1={moodToY(m)}
            x2={width - PAD_X}
            y2={moodToY(m)}
            stroke={theme.border}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ))}
        {present.length > 1 && (
          <Polyline
            points={polyline}
            fill="none"
            stroke={theme.accent}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {present.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={theme.mood[Math.round(p.score) as 1 | 2 | 3 | 4 | 5]}
            stroke={theme.surface}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <View style={[styles.labels, { paddingHorizontal: PAD_X }]}>
        {weekdayInitials.map((d, i) => (
          <Text key={i} style={[styles.label, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontSize: 10 },
});
