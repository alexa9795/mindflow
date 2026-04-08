import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../constants/fonts';
import { useSettings } from '../context/SettingsContext';
import type { Message } from '../services/api';

/** Strip common markdown: bold, italic, headers, bullet points, inline code. */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/__(.+?)__/g, '$1')        // bold alt
    .replace(/_(.+?)_/g, '$1')          // italic alt
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/^\s*[-*+]\s+/gm, '')      // bullet points
    .replace(/^\s*\d+\.\s+/gm, '')      // numbered lists
    .trim();
}

interface AIMessageProps {
  message: Message;
}

export default function AIMessage({ message }: AIMessageProps) {
  const { theme, entryFont } = useSettings();
  const activeEntryFont = FONTS[entryFont];

  if (message.role === 'assistant') {
    return (
      <View style={[styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.text, { color: theme.text, fontFamily: FONTS.modern }]}>
          {stripMarkdown(message.content)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.userBubble, { backgroundColor: theme.accent }]}>
      <Text style={[styles.text, styles.userText, { fontFamily: activeEntryFont }]}>
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aiBubble: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    padding: 14,
    maxWidth: '85%',
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 14,
    maxWidth: '85%',
    marginBottom: 8,
  },
  text: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFFFFF' },
});
