import * as ImagePicker from 'expo-image-picker';

/** Picked photo, still in the picker's temporary location. */
export interface PickedPhoto {
  uri: string;
  mimeType: string | null;
}

// Receipts only need to be readable, so keep files small.
const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };

export async function takeReceiptPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('DueRadar needs the camera to photograph a receipt. You can allow it in your phone’s settings.');
  }
  return toPicked(await ImagePicker.launchCameraAsync(OPTIONS));
}

/** Android 13+ shows the system photo picker, which needs no permission. */
export async function chooseReceiptPhoto(): Promise<PickedPhoto | null> {
  return toPicked(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}

function toPicked(result: ImagePicker.ImagePickerResult): PickedPhoto | null {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? null };
}
