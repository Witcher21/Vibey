import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extract text content from an uploaded file buffer.
 * Currently supports PDF and plain-text files.
 *
 * @param {Buffer} buffer       — raw file bytes
 * @param {string} mimetype     — e.g. 'application/pdf', 'text/plain'
 * @param {string} originalname — original filename
 * @returns {Promise<{text:string, pages:number, filename:string}>}
 */
export async function extractFileContent(buffer, mimetype, originalname) {
  if (mimetype === 'application/pdf') {
    const data = await pdf(buffer);
    return {
      text: data.text.trim(),
      pages: data.numpages,
      filename: originalname,
    };
  }

  // plain text, markdown, csv, code files
  if (
    mimetype.startsWith('text/') ||
    mimetype === 'application/json' ||
    mimetype === 'application/xml'
  ) {
    return {
      text: buffer.toString('utf-8'),
      pages: 1,
      filename: originalname,
    };
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}

/**
 * Accepted MIME types for upload validation.
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
