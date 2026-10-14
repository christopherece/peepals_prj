import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';

import { backend } from './backend';
import { useToilets } from './ToiletsContext';
import type { Photo, PickedPhoto } from './types';

export type PhotoSource = 'camera' | 'library';

/** Opens the camera or photo library. Resolves null if the user cancels or denies permission. */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'Allow camera access in Settings to take a photo.'
        : 'Allow photo access in Settings to attach a photo.'
    );
  }

  // quality < 1 re-encodes to JPEG (no HEIC), which keeps uploads small and the bucket's types simple.
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg' };
}

/** Photos of one toilet, plus an upload action. Callers gate `upload` with `useRequireMember`. */
export function useToiletPhotos(toiletId: string) {
  const { profile } = useToilets();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    backend
      .fetchPhotos(toiletId)
      .then(
        (p) => current && setPhotos(p),
        (e) => console.warn(e)
      )
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [toiletId]);

  const upload = useCallback(
    async (source: PhotoSource) => {
      if (!profile) throw new Error('Sign in to add photos.');
      const picked = await pickPhoto(source);
      if (!picked) return;
      setUploading(true);
      try {
        const photo = await backend.addPhoto(profile, toiletId, picked);
        setPhotos((prev) => [photo, ...prev]);
      } finally {
        setUploading(false);
      }
    },
    [profile, toiletId]
  );

  return { photos, loading, uploading, upload };
}
