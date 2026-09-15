import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function FormField({ label, error, ...inputProps }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} accessibilityLabel={label} placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : undefined]} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm }, label: { color: colors.text, fontWeight: '600', fontSize: 15 },
  input: { minHeight: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, color: colors.text, fontSize: 16 },
  inputError: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 13 },
});
