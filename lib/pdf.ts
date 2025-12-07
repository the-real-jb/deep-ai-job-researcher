export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('PDF extraction - buffer size:', buffer.length);
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    // Check if it's actually a PDF by looking at the header
    const header = buffer.toString('utf8', 0, 4);
    if (!header.startsWith('%PDF')) {
      throw new Error('File does not appear to be a valid PDF (missing PDF header)');
    }

    // Try traditional PDF text extraction first
    try {
      console.log('Trying pdf-parse-new...');
      const pdfParse = await import('pdf-parse-new');
      const data = await pdfParse.default(buffer);
      console.log('pdf-parse-new result:', { pages: data.numpages, textLength: data.text?.length || 0 });
      
      if (data.text && data.text.trim().length > 50) {
        console.log('PDF text extraction successful, length:', data.text.length);
        return data.text;
      }
      
      console.log('PDF text extraction returned insufficient content, trying GPT-4o...');
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      console.log('Falling back to GPT-4o for complex/image-based PDF...');
    }

    // If traditional extraction failed, provide helpful error message
    throw new Error('Could not extract text from PDF. This might be an image-based or complex PDF. Try using the Portfolio URL option instead, or use a text-based PDF.');

  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'File must be a PDF' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  return { valid: true };
} 