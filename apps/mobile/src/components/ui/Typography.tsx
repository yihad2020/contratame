import type { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';
export function Title({ children }: PropsWithChildren) { return <Text style={styles.title}>{children}</Text>; }
export function Body({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) { return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>; }
export function ErrorMessage({ children }: PropsWithChildren) { return <Text accessibilityRole="alert" style={styles.error}>{children}</Text>; }
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' }, body: { color: colors.text, fontSize: 16, lineHeight: 23 }, muted: { color: colors.muted }, error: { color: colors.danger, backgroundColor: colors.dangerBackground, padding: 12, borderRadius: 8 } });
