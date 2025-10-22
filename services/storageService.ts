import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getCurrentTenantId } from './tenantContext';

/**
 * Upload a file to Firebase Storage
 * @param file - File or Blob to upload
 * @param path - Storage path (folder structure)
 * @param fileName - Name of the file
 * @returns Promise with download URL and storage path
 */
export const uploadFile = async (
  file: File | Blob,
  path: string,
  fileName: string
): Promise<{ downloadUrl: string; storagePath: string }> => {
  const tenantId = getCurrentTenantId();
  
  // Create tenant-scoped path: tenants/{tenantId}/{path}/{fileName}
  const fullPath = `tenants/${tenantId}/${path}/${fileName}`;
  const storageRef = ref(storage, fullPath);

  // Upload file
  await uploadBytes(storageRef, file);

  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    downloadUrl,
    storagePath: fullPath,
  };
};

/**
 * Delete a file from Firebase Storage
 * @param storagePath - Path to the file in Storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
};

/**
 * Upload an EOD report attachment
 * @param file - File to upload
 * @param reportId - Report ID for organization
 * @returns Attachment object with Storage URL
 */
export const uploadReportAttachment = async (
  file: File,
  reportId: string
): Promise<{
  name: string;
  type: string;
  size: number;
  storageUrl: string;
  storagePath: string;
}> => {
  // Generate unique filename to prevent conflicts
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${timestamp}_${sanitizedName}`;

  // Upload to reports/{reportId}/attachments/
  const { downloadUrl, storagePath } = await uploadFile(
    file,
    `reports/${reportId}/attachments`,
    uniqueFileName
  );

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    storageUrl: downloadUrl,
    storagePath: storagePath,
  };
};

/**
 * Delete all attachments for a report
 * @param attachments - Array of attachments to delete
 */
export const deleteReportAttachments = async (
  attachments: Array<{ storagePath?: string }>
): Promise<void> => {
  const deletePromises = attachments
    .filter((att) => att.storagePath) // Only delete Storage-based attachments
    .map((att) => deleteFile(att.storagePath!));

  await Promise.all(deletePromises);
};

/**
 * Get display URL for an attachment (handles both legacy base64 and Storage URLs)
 * @param attachment - Attachment object
 * @returns URL to display the attachment
 */
export const getAttachmentDisplayUrl = (attachment: {
  dataUrl?: string;
  storageUrl?: string;
}): string => {
  // Prefer Storage URL (new format), fallback to base64 (legacy)
  return attachment.storageUrl || attachment.dataUrl || '';
};
