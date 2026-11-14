import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { firebaseStorage } from './auth';
import { validateUploadFile } from './pureCalculations';

export interface UploadedFileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

export async function uploadDocumentFile(
  uid: string,
  docId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedFileMetadata> {
  const validation = validateUploadFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid upload file.');
  }

  const safeName = sanitizeFileName(file.name);
  const storagePath = `users/${uid}/documents/${docId}_${Date.now()}_${safeName}`;
  const storageRef = ref(firebaseStorage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        reject(error);
      },
      () => resolve()
    );
  });

  const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    storagePath,
    downloadUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteDocumentFile(storagePath?: string): Promise<void> {
  if (!storagePath || !storagePath.trim()) return;
  try {
    const fileRef = ref(firebaseStorage, storagePath);
    await deleteObject(fileRef);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'storage/object-not-found') {
      return;
    }
    throw err;
  }
}
