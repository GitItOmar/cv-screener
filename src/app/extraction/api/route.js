/**
 * Extraction API Route
 * Handles data extraction from uploaded files and optionally triggers evaluation
 */

import { extractFromFile } from '../domain/extractor.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const includeEvaluation = formData.get('includeEvaluation') === 'true';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: 'Invalid file format' }, { status: 400 });
    }

    const result = await extractFromFile(file);

    // If evaluation is requested, call evaluation API
    let evaluation = null;
    let evaluationError = null;

    if (includeEvaluation) {
      try {
        // Log that we're starting evaluation
        console.log('Starting evaluation for extracted resume data...');

        // Construct evaluation API URL
        const baseUrl = new URL(request.url).origin;
        const evaluationUrl = `${baseUrl}/evaluation/api`;

        const evaluationResponse = await fetch(evaluationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result.extractedData),
        });

        if (evaluationResponse.ok) {
          evaluation = await evaluationResponse.json();

          // Log evaluation results
          console.log('=== RESUME EVALUATION RESULTS ===');
          console.log(`Final Score: ${evaluation.summary.finalScore}%`);
          console.log(`Recommendation: ${evaluation.summary.recommendation}`);
          console.log(`Total Processing Time: ${evaluation.metadata.totalProcessingTime}ms`);
          console.log('Category Scores:');

          Object.entries(evaluation.categories).forEach(([category, score]) => {
            console.log(`  ${category}: ${score.percentage}% (${score.score}/${score.maxScore})`);
          });

          if (evaluation.summary.penalties?.length > 0) {
            console.log('Penalties Applied:');
            evaluation.summary.penalties.forEach((penalty) => {
              console.log(`  - ${penalty}`);
            });
          }

          console.log('================================');
        } else {
          const errorData = await evaluationResponse.json();
          evaluationError = errorData.details || errorData.error || 'Evaluation failed';

          console.log('=== RESUME EVALUATION FAILED ===');
          console.log(`Error: ${evaluationError}`);
          console.log('===============================');
        }
      } catch (error) {
        evaluationError = `Evaluation request failed: ${error.message}`;
        console.log('=== RESUME EVALUATION ERROR ===');
        console.log(`Error: ${evaluationError}`);
        console.log('==============================');
      }
    }

    return Response.json(
      {
        success: true,
        data: result.extractedData, // Changed to 'data' to match test expectations
        text: result.text, // Include the text for evaluation
        evaluation,
        evaluationError,
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
