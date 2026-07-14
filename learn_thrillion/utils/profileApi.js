import api from './api_endpoints/api';

/**
 * Upload profile photo (multipart). Field name: `image`.
 * @returns {Promise<{ profile_image_url: string|null, user: object }>}
 */
export function uploadProfileImage(uri, { mimeType = 'image/jpeg', fileName = 'profile.jpg' } = {}) {
  const form = new FormData();
  form.append('image', {
    uri,
    type: mimeType,
    name: fileName,
  });
  return api
    .post('profile/image/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })
    .then((r) => r.data);
}
