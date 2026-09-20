const path = require('path');
const fs = require('fs');

/**
 * Storage Service Abstraction
 * Currently implements local filesystem storage with path normalization.
 * Designed to be swapped or extended with AWS S3, Cloudinary, or GCS for cloud deployments.
 */
class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.uploadsDir = path.join(__dirname, '../uploads');

    if (this.storageType === 'local' && !fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generates public URL for a stored file
   * @param {string} filename - Stored file basename
   * @param {string} baseUrl - Optional server base URL
   * @returns {string} Publicly accessible file URL
   */
  getFileUrl(filename, baseUrl = '') {
    if (!filename) return null;
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    const cleanName = path.basename(filename);
    return `${baseUrl}/uploads/${cleanName}`;
  }

  /**
   * Deletes a file from storage
   * @param {string} filename - Stored file basename
   */
  async deleteFile(filename) {
    if (!filename) return;
    if (this.storageType === 'local') {
      const filePath = path.join(this.uploadsDir, path.basename(filename));
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          console.error(`[StorageService] Failed to delete file ${filePath}:`, err);
        }
      }
    }
  }
}

module.exports = new StorageService();
