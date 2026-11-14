import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

const MAX_QUERY_LENGTH = 100;

export function HomeSearchBar({ onSubmit }: { onSubmit: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const submit = () => onSubmit(query);

  return (
    <View style={styles.bar}>
      <View style={styles.field}>
        <AppIcon name="search" color={colors.navyDeep} size={sizing.iconMd} />
        <TextInput
          accessibilityLabel="Buscar un oficio o servicio"
          maxLength={MAX_QUERY_LENGTH}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="Busca un oficio o servicio"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
      </View>
      <PressableScale
        accessibilityLabel="Buscar"
        accessibilityRole="button"
        onPress={submit}
        style={styles.submit}
      >
        <AppIcon name="arrowRight" color={colors.white} size={sizing.iconMd} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingLeft: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: { flex: 1, minHeight: sizing.touchTarget, color: colors.text, ...typography.bodyStrong, fontWeight: '600', letterSpacing: -0.2 },
  submit: {
    width: sizing.touchTarget,
    height: sizing.touchTarget,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
});
