import fs from 'fs/promises';

/**
 * Clean up failed file uploads to prevent storage bloat
 * @param {Array} files - Array of multer file objects
 * @param {Array} failedUploads - Array of files that failed to upload
 */
export const cleanupFailedUploads = async (files, failedUploads) => {
  if (!files || !Array.isArray(files) || !failedUploads || !Array.isArray(failedUploads)) {
    return;
  }
  
  for (const failedFile of failedUploads) {
    try {
      // Delete from temporary storage if file has a path
      if (failedFile.path && failedFile.path !== failedFile.originalname) {
        await fs.unlink(failedFile.path);
      }
    } catch (error) {
      // Don't throw error, continue with other files
    }
  }
};

/**
 * Clean up all files in case of complete failure
 * @param {Array} files - Array of multer file objects
 */
export const cleanupAllFiles = async (files) => {
  if (!files || !Array.isArray(files)) {
    return;
  }
  
  for (const file of files) {
    try {
      if (file.path && file.path !== file.originalname) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      // Continue with other files
    }
  }
};
