import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/themes';

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Renders a calendar grid for the current month, marking days that have an
 * entry with their mood emoji (or a plain dot when no mood was logged). */
export default function MonthCalendar({
  days,
  moodEmojis,
  theme,
}: {
  /** Map of "YYYY-MM-DD" → mood (1-5, rounded) for days with at least one entry. */
  days: Record<string, number | null>;
  moodEmojis: string[];
  theme: Theme;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Sun..6=Sat → shift so the grid starts on Monday.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const todayDate = now.getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateKey(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <Text key={i} style={[styles.weekdayLabel, { color: theme.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={styles.cell} />;
          const mood = days[dateKey(day)];
          const hasEntry = mood !== undefined;
          const isToday = day === todayDate;
          return (
            <View key={i} style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  hasEntry && { backgroundColor: theme.accent + '1F' },
                  isToday && { borderWidth: 1.5, borderColor: theme.accent },
                ]}
              >
                {hasEntry && mood != null ? (
                  <Text style={styles.moodEmoji}>{moodEmojis[mood - 1]}</Text>
                ) : (
                  <Text style={[styles.dayNumber, { color: hasEntry ? theme.text : theme.textSecondary }]}>
                    {day}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: '78%',
    height: '78%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { fontSize: 12, fontWeight: '500' },
  moodEmoji: { fontSize: 15 },
});
