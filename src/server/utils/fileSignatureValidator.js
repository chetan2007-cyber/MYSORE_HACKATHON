const fs = require('fs');
const path = require('path');

/**
 * Validates the raw binary signature (magic bytes) of uploaded files
 * to prevent disguised files (e.g. text or scripts renamed to .jpg)
 * from being accepted by the backend.
 */
function validateFileSignatures(files = []) {
  if (!files || files.length === 0) {
    return { isValid: true };
  }

  for (const file of files) {
    const filePath = file.path;
    if (!fs.existsSync(filePath)) continue;

    // Read initial 12 bytes
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      return {
        isValid: false,
        invalidFile: file.originalname,
        reason: 'File size too small to contain a valid image header.'
      };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    // WebP has 'RIFF' at 0-3 and 'WEBP' at 8-11
    const isRiff = buffer.toString('utf8', 0, 4) === 'RIFF';
    const isWebp = isRiff && buffer.toString('utf8', 8, 12) === 'WEBP';
    // MP4 has 'ftyp' at 4-8
    const isMp4 = buffer.toString('utf8', 4, 8) === 'ftyp';

    // Extension to signature matching
    if (['.jpg', '.jpeg'].includes(ext)) {
      if (!isJpeg) {
        return {
          isValid: false,
          invalidFile: file.originalname,
          reason: 'File has .jpg extension but lacks JPEG binary signature (FF D8 FF).'
        };
      }
    } else if (ext === '.png') {
      if (!isPng) {
        return {
          isValid: false,
          invalidFile: file.originalname,
          reason: 'File has .png extension but lacks PNG binary signature.'
        };
      }
    } else if (ext === '.webp') {
      if (!isWebp) {
        return {
          isValid: false,
          invalidFile: file.originalname,
          reason: 'File has .webp extension but lacks WebP binary signature.'
        };
      }
    } else if (ext === '.mp4') {
      if (!isMp4) {
        return {
          isValid: false,
          invalidFile: file.originalname,
          reason: 'File has .mp4 extension but lacks MP4 ftyp binary signature.'
        };
      }
    } else {
      // General image signature check if extension is ambiguous
      if (!isJpeg && !isPng && !isWebp && !isMp4) {
        return {
          isValid: false,
          invalidFile: file.originalname,
          reason: 'File binary header does not match any allowed image or video format.'
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Unlinks / removes uploaded files immediately upon rejection
 * ensuring no invalid or malicious files persist on the server disk.
 */
function cleanUploadedFiles(files = []) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.warn(`[File Clean Warning] Could not remove ${file.path}:`, err.message);
    }
  }
}

module.exports = {
  validateFileSignatures,
  cleanUploadedFiles
};
