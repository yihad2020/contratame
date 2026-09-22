import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizing, spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  background?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}>;

export function Screen({ children, scroll = true, contentStyle, background, header, footer }: ScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(
    0,
    Math.min(width - sizing.screenPadding * 2, sizing.screenMaxWidth - sizing.screenPadding * 2),
  );
  const content = (
    <View style={[styles.frame, { width: contentWidth }]}>
      <View style={[styles.content, header && !footer ? { paddingBottom: spacing.xl + insets.bottom } : undefined, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      {background ? <View pointerEvents="none" style={styles.background}>{background}</View> : null}
      <SafeAreaView style={[styles.safeArea, header ? styles.headerSafe : undefined, background ? styles.clear : undefined]} edges={header ? ['top', 'right', 'left'] : ['top', 'right', 'bottom', 'left']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scroll}
              style={header ? styles.scrollBackground : undefined}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {header}
              {content}
            </ScrollView>
          ) : <>{header}{content}</>}
          {footer ? <View style={[styles.footer, header ? { paddingBottom: insets.bottom } : undefined]}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  background: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerSafe: { backgroundColor: colors.navyDeep },
  clear: { backgroundColor: colors.transparent },
  scroll: { flexGrow: 1 },
  scrollBackground: { backgroundColor: colors.background },
  footer: { backgroundColor: colors.surface },
  frame: {
    flex: 1,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
