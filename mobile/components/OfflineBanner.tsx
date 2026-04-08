import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../constants/fonts';

interface OfflineBannerProps {
  visible: boolean;
}

export default function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={[styles.text, { fontFamily: FONTS.modern }]}>You're offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B45309',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
