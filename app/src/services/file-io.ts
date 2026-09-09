/**
 * Device file I/O for backup and export: share sheet and document picker.
 *
 * Thin wrappers over expo-file-system, expo-sharing and
 * expo-document-picker. Kept separate from pure utils so those stay
 * runnable in Node tests.
 */

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device.');
    this.name = 'SharingUnavailableError';
  }
}

export async function shareTextFile(
  filename: string,
  contents: string,
  mimeType: string,
  dialogTitle: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new SharingUnavailableError();
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/**
 * Lets the user pick a backup file and returns its contents.
 * Returns null when the user cancels.
 */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled) {
    return null;
  }
  const uri = result.assets[0]?.uri;
  if (!uri) {
    return null;
  }
  return new File(uri).text();
}
