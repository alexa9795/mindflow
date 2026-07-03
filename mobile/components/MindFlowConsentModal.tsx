import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COMPANION_NAME } from '../constants/config';
import { FONTS } from '../constants/fonts';
import { useSettings } from '../context/SettingsContext';

interface MindFlowConsentModalProps {
  visible: boolean;
  enabling: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export default function MindFlowConsentModal({ visible, enabling, onEnable, onDismiss }: MindFlowConsentModalProps) {
  const { theme } = useSettings();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => undefined}
        >
          <Text style={[styles.title, { color: theme.text, fontFamily: FONTS.modern }]}>
            Meet {COMPANION_NAME}
          </Text>
          <Text style={[styles.body, { color: theme.text, fontFamily: FONTS.modern }]}>
            {COMPANION_NAME} reflects on your journal entries with empathy and curiosity — like a thoughtful friend reading along.
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            Your entries are processed by the{' '}
            <Text style={[styles.emphasis, { color: theme.text }]}>Anthropic Claude API</Text>.
            Nothing is stored by Anthropic after the response is returned.
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
            This is entirely optional. You can turn {COMPANION_NAME} off at any time in{' '}
            <Text style={[styles.emphasis, { color: theme.text }]}>Settings → Privacy</Text>.
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { borderColor: theme.border }]}
              onPress={onDismiss}
              disabled={enabling}
            >
              <Text style={[styles.btnText, { color: theme.textSecondary, fontFamily: FONTS.modern }]}>
                No thanks
              </Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.accent }]}
              onPress={onEnable}
              disabled={enabling}
            >
              {enabling ? (
                <ActivityIndicator color={theme.background} size="small" />
              ) : (
                <Text style={[styles.btnText, { color: theme.background, fontFamily: FONTS.modern }]}>
                  Enable {COMPANION_NAME}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 19, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  emphasis: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '600' },
});
