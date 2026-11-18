import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Kit';
import { ui } from '@/constants/theme';

/** Onboarding section: optional section title above a white rounded card. */
export function WorkerSurface({ title, children }: PropsWithChildren<{ title?: string }>) {
  const card = <Card style={styles.surface}>{children}</Card>;
  if (!title) return card;
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {card}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  surface: { gap: 14 },
  title: { color: ui.ink, fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
