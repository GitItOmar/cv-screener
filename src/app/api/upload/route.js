/**
 * Upload API Route
 * Handles file uploads with automatic extraction
 */

import { handleFileUpload } from '@/app/upload/domain/uploader.js';

export async function POST(request) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const jobSettingsJson = formData.get('jobSettings');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // Parse job settings if provided
    let jobSettings = null;
    if (jobSettingsJson) {
      try {
        jobSettings = JSON.parse(jobSettingsJson);
      } catch {
        // Ignore invalid JSON, use default settings
      }
    }

    // Handle file upload and extraction through domain layer
    const result = await handleFileUpload(file, { jobSettings });

    // Add processing time to response
    const processingTime = Date.now() - startTime;

    if (result.processing) {
      // Partial success case (upload succeeded, extraction failed)
      result.processing.processingTime = processingTime;
    } else {
      // Full success case
      result.processing = {
        success: true,
        processingTime,
      };
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: 'Upload failed',
        details: error.message,
        processing: {
          success: false,
          processingTime: Date.now() - startTime,
        },
      },
      { status: 500 },
    );
  }
}
