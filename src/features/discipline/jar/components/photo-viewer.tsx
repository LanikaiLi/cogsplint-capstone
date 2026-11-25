import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Reward } from '@/features/discipline/jar/jar-api';
import { fonts, radius } from '@/theme';

// Full screen view of a reward's photo, with its name, date and note. Pinch to zoom on iPhone.
export function PhotoViewer({ reward, onClose }: { reward: Reward | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  const date = reward
    ? new Date(reward.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <Modal visible={!!reward} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.zoomContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}>
          {!!reward?.photo_url && <Image source={{ uri: reward.photo_url }} style={styles.photo} contentFit="contain" />}
        </ScrollView>

        <Pressable
          style={[styles.close, { top: insets.top + 12 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        {!!reward && (
          <View style={[styles.caption, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.captionTitle}>{reward.description}</Text>
            <Text style={styles.captionDate}>{date}</Text>
            {!!reward.reflection && <Text style={styles.captionNote}>“{reward.reflection}”</Text>}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#000000' },
  zoomContent: { flexGrow: 1, justifyContent: 'center' },
  photo: { width: '100%', maxWidth: 480, alignSelf: 'center', aspectRatio: 1 },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeText: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: '#FFFFFF' },
  caption: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  captionTitle: { fontFamily: fonts.heading, fontSize: 18, color: '#FFFFFF' },
  captionDate: { marginTop: 2, fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  captionNote: { marginTop: 10, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: '#FFFFFF' },
});
