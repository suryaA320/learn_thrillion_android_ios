import * as FileSystem from 'expo-file-system';

export const PROFILE_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const PROFILE_IMAGE_TARGET_BYTES = 900 * 1024;

/**
 * Prepare a local image URI for profile upload.
 *
 * Client compression uses ImagePicker quality (see ProfilePhotoButton).
 * Server-side Pillow also compresses to ≤1MB / ~900KB when needed.
 */
export async function prepareProfileImageUri(uri, { fileSize } = {}) {
  if (!uri) {
    throw new Error('No image selected.');
  }

  let size = Number(fileSize) || 0;
  if (!size) {
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      size = Number(info?.size) || 0;
    } catch {
      size = 0;
    }
  }

  // Soft client check: warn-style rejection only if absurdly large and we
  // somehow got an uncompressed original (server still accepts up to 25MB).
  if (size > 25 * 1024 * 1024) {
    throw new Error('Image is too large. Choose a smaller photo.');
  }

  return {
    uri,
    mimeType: 'image/jpeg',
    fileName: 'profile.jpg',
    fileSize: size || undefined,
  };
}

/** Suggest ImagePicker `quality` so oversize photos are compressed on pick. */
export function suggestedPickerQuality(fileSize) {
  const size = Number(fileSize) || 0;
  if (!size || size <= PROFILE_IMAGE_MAX_BYTES) return 0.85;
  if (size <= 2 * 1024 * 1024) return 0.7;
  if (size <= 5 * 1024 * 1024) return 0.55;
  return 0.4;
}
