/**
 * Extraction API Route
 * Handles data extraction from uploaded files
 */

import { extractFromFile } from '../domain/extractor.js';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // Extract data from file through domain layer
    const result = await extractFromFile(file);

    // Prepare response
    const response = {
      success: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        processedAt: new Date().toISOString(),
      },
      extractedData: result.extractedData,
      validation: result.validation,
      statistics: result.statistics,
      debug: result.debug,
      processing: {
        processingTime: Date.now() - startTime,
        success: true,
      },
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: 'Extraction failed',
        details: error.message,
        processing: {
          processingTime: Date.now() - startTime,
          success: false,
        },
      },
      { status: 500 },
    );
  }
}
