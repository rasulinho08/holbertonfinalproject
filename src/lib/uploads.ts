import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '@/api/client';
import { Endpoints } from '@/api/endpoints';

export type UploadKind = 'avatar' | 'cover' | 'publication';

/** Longest edge after resizing, per use. Avatars render at ≤ 120pt. */
const MAX_EDGE: Record<UploadKind, number> = {
  avatar: 512,
  cover: 1500,
  publication: 1500,
};

/**
 * Uploads a picked image and returns a URL anyone can load.
 *
 * A picker URI (`file://` on a phone, `blob:` on the web) only means something
 * on the device that produced it; saving it as an avatar made the photo appear
 * for the uploader and nobody else. The image is resized and re-encoded as JPEG
 * on the device — which also converts HEIC from iPhones — and the bytes are
 * sent to the API, which stores them and answers with a public URL.
 */
export async function uploadImage(uri: string, kind: UploadKind, width?: number): Promise<string> {
  const edge = MAX_EDGE[kind];
  // Never upscale: a picture already narrower than the target is only re-encoded.
  const actions = width !== undefined && width <= edge ? [] : [{ resize: { width: edge } }];
  const resized = await manipulateAsync(uri, actions, {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!resized.base64) throw new Error('Could not read the selected image');

  const stored = await api.post<{ id: string; url: string }>(Endpoints.uploads.create, {
    kind,
    data: resized.base64,
  });
  return stored.url;
}

/** True for URIs that only exist on this device and must be uploaded first. */
export function isLocalUri(uri: string | null | undefined): uri is string {
  return !!uri && !/^https?:\/\//i.test(uri);
}
