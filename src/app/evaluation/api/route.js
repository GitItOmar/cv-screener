/**
 * Evaluation API Route
 * Handles resume evaluation requests
 */

import { resumeEvaluator } from '../domain/evaluator.js';

export async function POST(request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const resumeData = await request.json();

    if (!resumeData) {
      return Response.json(
        {
          error: 'No resume data provided',
          details: 'Request body must contain extracted resume data',
        },
        { status: 400 },
      );
    }

    // Evaluate resume through domain layer
    const result = await resumeEvaluator.evaluateResume(resumeData);

    // Add API processing time
    const apiProcessingTime = Date.now() - startTime;

    if (result.success) {
      // Add API metadata to successful response
      result.data.metadata.apiProcessingTime = apiProcessingTime;
      result.data.metadata.totalProcessingTime =
        result.data.metadata.processingTime + apiProcessingTime;

      return Response.json(result.data, { status: 200 });
    } else {
      // Handle evaluation failure
      return Response.json(
        {
          error: 'Evaluation failed',
          details: result.error,
          metadata: {
            ...result.metadata,
            apiProcessingTime,
            totalProcessingTime: (result.metadata.processingTime || 0) + apiProcessingTime,
          },
        },
        { status: 422 }, // Unprocessable Entity
      );
    }
  } catch (error) {
    // Handle unexpected errors
    const apiProcessingTime = Date.now() - startTime;

    // Check if it's a JSON parsing error
    if (error.name === 'SyntaxError') {
      return Response.json(
        {
          error: 'Invalid JSON format',
          details: 'Request body must contain valid JSON with resume data',
          metadata: {
            failedAt: new Date().toISOString(),
            apiProcessingTime,
          },
        },
        { status: 400 },
      );
    }

    // Generic error handling
    return Response.json(
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        metadata: {
          failedAt: new Date().toISOString(),
          apiProcessingTime,
        },
      },
      { status: 500 },
    );
  }
}

// Optional: Add a GET endpoint for health checking
export async function GET() {
  try {
    // Test the evaluation system connection
    const isHealthy = await resumeEvaluator.testConnection();

    if (isHealthy) {
      return Response.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'evaluation-api',
        version: '1.0',
      });
    } else {
      return Response.json(
        {
          status: 'unhealthy',
          error: 'LLM connection failed',
          timestamp: new Date().toISOString(),
          service: 'evaluation-api',
        },
        { status: 503 }, // Service Unavailable
      );
    }
  } catch (error) {
    return Response.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Health check error',
        timestamp: new Date().toISOString(),
        service: 'evaluation-api',
      },
      { status: 503 },
    );
  }
}
