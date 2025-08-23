/**
 * Extraction API Route
 * Handles data extraction from uploaded files
 */

import { extractFromFile } from '../domain/extractor.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    const result = await extractFromFile(file);

    return Response.json(
      {
        success: true,
        extractedData: result.extractedData,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: 'Extraction failed',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
