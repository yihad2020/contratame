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
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, sizing, spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  background?: ReactNode;
}>;

export function Screen({ children, scroll = true, contentStyle, background }: ScreenProps) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(
    0,
    Math.min(width - sizing.screenPadding * 2, sizing.screenMaxWidth - sizing.screenPadding * 2),
  );
  const content = (
    <View style={[styles.frame, { width: contentWidth }]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      {background ? <View pointerEvents="none" style={styles.background}>{background}</View> : null}
      <SafeAreaView style={[styles.safeArea, background ? styles.clear : undefined]} edges={['top', 'right', 'bottom', 'left']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : content}
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
  clear: { backgroundColor: colors.transparent },
  scroll: { flexGrow: 1 },
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
