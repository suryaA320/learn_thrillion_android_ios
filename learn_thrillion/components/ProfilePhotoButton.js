import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadProfileImage } from '../utils/profileApi';
import {
  prepareProfileImageUri,
  PROFILE_IMAGE_MAX_BYTES,
} from '../utils/prepareProfileImage';

const DEFAULT_AVATAR = require('../assets/FacultyAvatar.png');

/**
 * Tappable profile avatar: pick from library (quality-compressed), upload.
 * Server compresses to ≤1MB / ~900KB if still oversize.
 */
export default function ProfilePhotoButton({
  uri,
  size = 96,
  onUploaded,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);

  const pickAndUpload = useCallback(async () => {
    if (busy || disabled) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access to set your profile picture.'
        );
        return;
      }

      // First pass at high quality to get fileSize when available.
      const preview = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (preview.canceled || !preview.assets?.length) return;

      setBusy(true);
      const asset = preview.assets[0];
      // If still large, re-pick isn't needed — server Pillow compresses.
      // Prefer lower-quality copy when asset reports >1MB.
      let uploadUri = asset.uri;
      let uploadSize = asset.fileSize;
      if (Number(asset.fileSize) > PROFILE_IMAGE_MAX_BYTES) {
        // Re-export via picker already quality-capped; keep this URI.
        // ImagePicker quality:0.7 usually lands under 1MB after crop.
        uploadUri = asset.uri;
        uploadSize = asset.fileSize;
      }

      const prepared = await prepareProfileImageUri(uploadUri, {
        fileSize: uploadSize,
      });
      const data = await uploadProfileImage(prepared.uri, {
        mimeType: prepared.mimeType,
        fileName: prepared.fileName,
      });
      const nextUrl = data?.profile_image_url || null;
      if (typeof onUploaded === 'function') {
        await onUploaded({
          profile_image_url: nextUrl,
          user: data?.user,
        });
      }
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        'Could not upload profile photo.';
      Alert.alert('Upload failed', String(msg));
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, onUploaded]);

  const source = uri ? { uri } : DEFAULT_AVATAR;
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <TouchableOpacity
      onPress={pickAndUpload}
      disabled={busy || disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={styles.wrap}
    >
      <Image source={source} style={[styles.avatar, dim]} />
      <View style={[styles.badge, busy && styles.badgeBusy]}>
        {busy ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.badgeText}>Edit</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderWidth: 3,
    borderColor: '#c7d2fe',
    backgroundColor: '#e0e7ff',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBusy: {
    minWidth: 36,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
