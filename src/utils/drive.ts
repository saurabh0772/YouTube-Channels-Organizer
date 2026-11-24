// Helper functions to parse and format Google Drive links and thumbnail URLs

export function extractDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/view
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (fileDMatch) return fileDMatch[1];

  // Pattern 2: id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (idParamMatch) return idParamMatch[1];

  // Pattern 3: /d/FILE_ID
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (dMatch) return dMatch[1];

  return null;
}

export function getDriveThumbnailPreviewUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;

  // Google's direct high-res image thumbnail endpoint
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
}

export function isValidUrl(urlString: string): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

