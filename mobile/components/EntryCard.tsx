import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { MOOD_EMOJIS } from '../constants/moods';
import { FONTS } from '../constants/fonts';
import type { Entry } from '../services/api';

interface EntryCardProps {
  entry: Entry;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter();
  const { theme, moodSetId, entryFont } = useSettings();
  const moodEmojis = MOOD_EMOJIS[moodSetId] ?? MOOD_EMOJIS.basic;
  const moodEmoji = entry.mood_score ? moodEmojis[entry.mood_score - 1] : null;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => router.push(`/entry/${entry.id}`)}
    >
      <View style={styles.row}>
        <Text style={[styles.date, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
          {formatDate(entry.created_at)}
        </Text>
        {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
      </View>
      <Text
        numberOfLines={2}
        style={[styles.preview, { color: theme.text, fontFamily: FONTS[entryFont] }]}
      >
        {entry.content.slice(0, 80)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: { fontSize: 12, fontWeight: '600' },
  moodEmoji: { fontSize: 16 },
  preview: { fontSize: 15, lineHeight: 22 },
});
