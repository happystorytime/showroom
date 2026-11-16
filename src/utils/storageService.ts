import { requireSupabase } from './supabaseClient';
import { validateUploadFile } from './pureCalculations';

export const SUPABASE_STORAGE_BUCKET = 'rto-documents';

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

  const client = requireSupabase();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `users/${uid}/documents/${docId}_${Date.now()}_${safeName}`;

  if (onProgress) onProgress(15);

  const { error: uploadError } = await client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        `Upload failed. Ensure the '${SUPABASE_STORAGE_BUCKET}' bucket and Storage RLS policies exist in Supabase.`
    );
  }

  if (onProgress) onProgress(75);

  // Use a 1-year signed URL for private bucket access; fallback to public URL if bucket is public
  const { data: signedData, error: signedError } = await client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  let downloadUrl = signedData?.signedUrl || '';
  if (signedError || !downloadUrl) {
    const { data: pubData } = client.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    downloadUrl = pubData.publicUrl;
  }

  if (onProgress) onProgress(100);

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
  const client = requireSupabase();
  const { error } = await client.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .remove([storagePath]);

  if (error && !error.message.toLowerCase().includes('not found')) {
    throw new Error(error.message || 'Failed to delete file from Supabase Storage.');
  }
}
