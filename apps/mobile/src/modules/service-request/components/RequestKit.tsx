import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import type { IconName } from '@/components/ui/Icon';
import { StatusPill, type StatusTone } from '@/components/ui/Kit';
import { ui, uiRadii } from '@/constants/theme';
import { serviceRequestStatusLabels } from '@/modules/service-request/service-request-model';
import type { ServiceRequestStatus } from '@/modules/service-request/types';

const statusVisuals: Record<ServiceRequestStatus, { tone: StatusTone; icon: IconName }> = {
  pending: { tone: 'accent', icon: 'clock-time-four' },
  quoted: { tone: 'info', icon: 'cog' },
  accepted: { tone: 'info', icon: 'progress-check' },
  rejected: { tone: 'danger', icon: 'close-circle' },
  cancelled: { tone: 'neutral', icon: 'cancel' },
  expired: { tone: 'neutral', icon: 'timer-sand-complete' },
};

/** Status pill for a service request (label from the model, tone/icon by status group). */
export function RequestStatusPill({ status }: { status: ServiceRequestStatus }) {
  const visual = statusVisuals[status];
  return <StatusPill icon={visual.icon} label={serviceRequestStatusLabels[status]} tone={visual.tone} />;
}

type RequestFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  helperText?: string;
  /** Shows "n/max" inside the field (counts characters like the validator does). */
  counterMax?: number;
  /** Keeps the label for screen readers only (when a numbered section title already names the field). */
  hideLabel?: boolean;
};

/** White rounded input used by the Nueva solicitud form (same contract as FormField). */
export function RequestField({ label, error, helperText, counterMax, hideLabel = false, multiline = false, value, ...inputProps }: RequestFieldProps) {
  const length = Array.from(value ?? '').length;
  return (
    <View style={styles.group}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <View style={[styles.shell, multiline && styles.shellMultiline, error ? styles.shellError : null]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          multiline={multiline}
          placeholderTextColor={ui.subtle}
          selectionColor={ui.accent}
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
        />
        {counterMax ? <Text style={styles.counter}>{length}/{counterMax}</Text> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { color: ui.inkSoft, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  shell: { minHeight: 52, justifyContent: 'center', backgroundColor: ui.card, borderWidth: 1.5, borderColor: ui.divider, borderRadius: uiRadii.lg },
  shellMultiline: { paddingBottom: 10 },
  shellError: { borderColor: ui.danger },
  input: { minHeight: 50, paddingHorizontal: 16, color: ui.ink, fontSize: 16, lineHeight: 22 },
  inputMultiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', paddingHorizontal: 16, color: ui.muted, fontSize: 13, lineHeight: 17 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 18 },
  helper: { color: ui.muted, fontSize: 13, lineHeight: 18 },
});
