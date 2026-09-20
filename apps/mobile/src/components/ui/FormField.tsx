import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { colors, radii, sizing, spacing, typography } from '@/constants/theme';

type FormFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  helperText?: string;
};

export function FormField({ label, error, helperText, secureTextEntry = false, editable = true, multiline = false, ...inputProps }: FormFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canTogglePassword = secureTextEntry;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, !editable && styles.inputDisabled, error && styles.inputError]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !passwordVisible}
          selectionColor={colors.primary}
          style={[styles.input, multiline && styles.multilineInput]}
        />
        {canTogglePassword ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.trailingAction}
          >
            <AppIcon name={passwordVisible ? 'eyeOff' : 'eye'} size={sizing.iconMd} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { color: colors.text, ...typography.label },
  inputShell: {
    minHeight: sizing.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  input: {
    flex: 1,
    minHeight: sizing.inputHeight - 2,
    paddingHorizontal: spacing.md,
    color: colors.text,
    ...typography.body,
  },
  multilineInput: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: 'top' },
  trailingAction: {
    width: sizing.touchTarget,
    minHeight: sizing.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.surfaceMuted },
  error: { color: colors.danger, ...typography.caption },
  helper: { color: colors.textSecondary, ...typography.caption },
});
