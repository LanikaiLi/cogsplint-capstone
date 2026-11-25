import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateReward, useExchangeRate, usePointsBalance } from '@/features/discipline/jar/jar-api';
import {
  dollarsToPoints,
  formatMoney,
  moneyEquivalent,
  parseDollars,
  validateReward,
} from '@/features/discipline/jar/jar-logic';
import { colors, fonts, radius } from '@/theme';
import { useCloseScreen } from '@/lib/use-close-screen';

// "Treat yourself": spend points on a reward. Opened from Jar as a sheet that slides up.
export default function RewardFormScreen() {
  const close = useCloseScreen('/discipline/jar');
  const insets = useSafeAreaInsets();
  const { data: balance } = usePointsBalance();
  const { data: rate } = useExchangeRate();
  const create = useCreateReward();

  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [reflection, setReflection] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (balance === undefined || rate === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      exif: false,
      // iPhone photos are often HEIC, which Chrome cannot show. "Compatible" makes iOS give us a JPEG.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function onSave() {
    const dollars = parseDollars(cost);
    const problem = validateReward({ description, dollars, rate: rate ?? 0, balance: balance ?? 0 });
    if (problem) {
      setMessage(problem);
      return;
    }
    setMessage(null);
    try {
      await create.mutateAsync({
        description: description.trim(),
        points_spent: dollarsToPoints(dollars ?? 0, rate ?? 0),
        reflection: reflection.trim() || null,
        photoUri,
      });
      close();
    } catch {
      setMessage('We could not save your reward. Please check your connection and try again.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={close} disabled={create.isPending} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.heading}>Treat yourself</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.balanceNote}>Your balance is {formatMoney(moneyEquivalent(balance, rate))}.</Text>

        <Text style={styles.label}>What is your reward?</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. A hand-brewed coffee"
          placeholderTextColor={colors.textMuted}
          maxLength={80}
          autoFocus
        />

        <Text style={styles.label}>Cost ($)</Text>
        <TextInput
          style={styles.input}
          value={cost}
          onChangeText={(value) => setCost(value.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          maxLength={9}
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {photoUri ? (
          <View style={styles.photoBox}>
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            <Pressable onPress={() => setPhotoUri(null)} disabled={create.isPending} accessibilityRole="button">
              <Text style={styles.photoAction}>Remove photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.photoButton} onPress={pickPhoto} accessibilityRole="button">
            <Text style={styles.photoButtonText}>Add a photo</Text>
          </Pressable>
        )}

        <Text style={styles.label}>How does this show my love for myself? (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={reflection}
          onChangeText={setReflection}
          placeholder="Write a sentence or two"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />

        {message && <Text style={styles.message}>{message}</Text>}

        <Pressable
          style={[styles.saveButton, create.isPending && styles.saveButtonBusy]}
          onPress={onSave}
          disabled={create.isPending}
          accessibilityRole="button">
          {create.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save reward</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cancel: { width: 64, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  topBarSpacer: { width: 64 },
  heading: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  balanceNote: { marginBottom: 20, fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  label: { marginBottom: 6, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  input: {
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  photoButton: {
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 14,
    borderRadius: radius.small,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  photoButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
  photoBox: { alignItems: 'flex-start', marginBottom: 18 },
  photo: { width: 120, height: 120, borderRadius: radius.small, backgroundColor: colors.primarySoft },
  photoAction: { marginTop: 8, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  message: { marginBottom: 16, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.notice },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  saveButtonBusy: { opacity: 0.7 },
  saveButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#FFFFFF' },
});
