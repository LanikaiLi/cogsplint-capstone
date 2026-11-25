import { useEffect, useState, useSyncExternalStore } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getActiveHostId, getDialog, pressDialogButton, registerDialogHost, subscribeToDialog } from '@/lib/dialog';
import { colors, fonts, radius } from '@/theme';

// Draws the popup opened by showDialog(). Put one on each layer that can cover the screen
// (see `level` in lib/dialog.ts). It is a plain overlay, so it also works on top of sheets.
export function DialogHost({ level = 0 }: { level?: number }) {
  const [hostId, setHostId] = useState<number | null>(null);
  const dialog = useSyncExternalStore(subscribeToDialog, getDialog, getDialog);
  const activeHostId = useSyncExternalStore(subscribeToDialog, getActiveHostId, getActiveHostId);
  const visible = !!dialog && hostId !== null && hostId === activeHostId;

  useEffect(() => {
    const host = registerDialogHost(level);
    setHostId(host.id);
    return host.remove;
  }, [level]);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
    }
  }, [visible]);

  if (!visible || !dialog) {
    return null;
  }

  const cancel = dialog.buttons.find((button) => button.style === 'cancel');
  const actions = dialog.buttons.filter((button) => button.style !== 'cancel');

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      {/* Tapping outside the card is the same as Cancel. */}
      <Pressable style={styles.backdrop} onPress={() => pressDialogButton(cancel)} accessibilityLabel="Close" />
      <View style={styles.card} accessibilityRole="alert">
        <ScrollView style={styles.scroll} bounces={false}>
          <Text style={styles.title}>{dialog.title}</Text>
          {!!dialog.message && <Text style={styles.message}>{dialog.message}</Text>}
        </ScrollView>
        {actions.map((button) => (
          <Pressable
            key={button.text}
            style={styles.primary}
            onPress={() => pressDialogButton(button)}
            accessibilityRole="button">
            <Text style={styles.primaryText}>{button.text}</Text>
          </Pressable>
        ))}
        {!!cancel && (
          <Pressable style={styles.cancel} onPress={() => pressDialogButton(cancel)} accessibilityRole="button">
            <Text style={styles.cancelText}>{cancel.text}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  card: {
    width: '100%',
    maxWidth: 300,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: radius.medium,
    backgroundColor: colors.background,
  },
  scroll: { flexGrow: 0 },
  title: { fontFamily: fonts.heading, fontSize: 16, lineHeight: 22, color: colors.text, textAlign: 'center' },
  message: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  primary: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 11,
    borderRadius: radius.small,
    backgroundColor: colors.primary,
  },
  primaryText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#FFFFFF' },
  cancel: { alignItems: 'center', marginTop: 4, paddingVertical: 9 },
  cancelText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
});
