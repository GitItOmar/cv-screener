/**
 * Variance Test Script
 * Tests the same CV 10 times to measure scoring variance
 * Uses API endpoints to avoid Next.js module resolution issues
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Statistics calculation functions
function calculateMean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateVariance(values) {
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return calculateMean(squaredDiffs);
}

function calculateStandardDeviation(values) {
  return Math.sqrt(calculateVariance(values));
}

function calculateRange(values) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
  };
}

// Simple hash function for text comparison
function generateTextHash(text) {
  if (!text) return '0';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function getStabilityRating(stdDev) {
  if (stdDev < 5) return 'GOOD';
  if (stdDev < 10) return 'MODERATE';
  return 'POOR';
}

function getRecommendation(isTextConsistent, stdDev) {
  if (!isTextConsistent) {
    return 'HIGH PRIORITY: Fix text extraction inconsistency - this is likely the root cause of evaluation variance';
  }
  if (stdDev > 10) {
    return 'Review LLM temperature settings or prompt consistency for evaluation';
  }
  return 'System is performing consistently';
}

async function runVarianceTest() {
  console.log('🧪 Starting CV Evaluation Variance Test...');
  console.log('📄 Testing CV: public/Lebenslauf.pdf');
  console.log('🔢 Number of runs: 10');
  console.log('⚠️  Note: This test requires the Next.js dev server to be running on port 3000\n');

  const results = [];
  const cvPath = path.join(process.cwd(), 'public', 'Lebenslauf.pdf');

  // Check if CV file exists
  if (!fs.existsSync(cvPath)) {
    throw new Error('CV file not found at public/Lebenslauf.pdf');
  }

  const baseUrl = 'http://localhost:3001';

  // Run evaluation 10 times
  for (let i = 1; i <= 10; i++) {
    console.log(`🔄 Running evaluation ${i}/10...`);

    try {
      // Create FormData with the CV file using form-data library
      const formData = new FormData();
      const cvStream = fs.createReadStream(cvPath);
      formData.append('file', cvStream, {
        filename: 'Lebenslauf.pdf',
        contentType: 'application/pdf',
      });
      formData.append('includeEvaluation', 'true');

      // Call the extraction API with evaluation
      const response = await fetch(`${baseUrl}/extraction/api`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Extraction/Evaluation failed: ${result.error || result.details}`);
      }

      if (result.evaluationError) {
        throw new Error(`Evaluation failed: ${result.evaluationError}`);
      }

      if (!result.evaluation) {
        throw new Error('No evaluation data returned');
      }

      // Store the result
      results.push({
        run: i,
        timestamp: new Date().toISOString(),
        overall: result.evaluation.overall,
        categories: result.evaluation.categories,
        summary: result.evaluation.summary,
        extractedText: result.data?.text || '',
        textLength: (result.data?.text || '').length,
        textHash: generateTextHash(result.data?.text || ''),
      });

      console.log(
        `   ✅ Run ${i}: ${result.evaluation.overall.finalPercentage}% (${result.evaluation.summary.recommendation})`,
      );
    } catch (error) {
      console.error(`   ❌ Run ${i} failed: ${error.message}`);
      // Add failed result
      results.push({
        run: i,
        timestamp: new Date().toISOString(),
        error: error.message,
        failed: true,
      });
    }

    // Add a small delay between requests to avoid overwhelming the API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n📊 Analyzing results...\n');

  // Filter successful results
  const successfulResults = results.filter((r) => !r.failed);

  // Analyze text consistency
  const textAnalysis = analyzeTextConsistency(successfulResults);

  if (successfulResults.length === 0) {
    throw new Error('All evaluations failed - cannot calculate variance');
  }

  // Extract scores for analysis
  const overallScores = {
    finalPercentage: successfulResults.map((r) => r.overall.finalPercentage),
    totalScore: successfulResults.map((r) => r.overall.totalScore),
  };

  // Extract category scores
  const categoryData = {};
  const categoryNames = [
    'selfEvaluation',
    'skillsSpecialties',
    'workExperience',
    'basicInformation',
    'educationBackground',
  ];

  categoryNames.forEach((category) => {
    if (successfulResults[0]?.categories?.[category]) {
      categoryData[category] = {
        scores: successfulResults.map((r) => r.categories[category].score),
        percentages: successfulResults.map((r) => r.categories[category].percentage),
      };
    }
  });

  // Calculate statistics
  const overallStats = {
    finalPercentage: {
      mean: calculateMean(overallScores.finalPercentage),
      variance: calculateVariance(overallScores.finalPercentage),
      stdDev: calculateStandardDeviation(overallScores.finalPercentage),
      ...calculateRange(overallScores.finalPercentage),
    },
    totalScore: {
      mean: calculateMean(overallScores.totalScore),
      variance: calculateVariance(overallScores.totalScore),
      stdDev: calculateStandardDeviation(overallScores.totalScore),
      ...calculateRange(overallScores.totalScore),
    },
  };

  // Calculate category statistics
  const categoryStats = {};
  Object.entries(categoryData).forEach(([category, data]) => {
    categoryStats[category] = {
      scores: {
        mean: calculateMean(data.scores),
        variance: calculateVariance(data.scores),
        stdDev: calculateStandardDeviation(data.scores),
        ...calculateRange(data.scores),
      },
      percentages: {
        mean: calculateMean(data.percentages),
        variance: calculateVariance(data.percentages),
        stdDev: calculateStandardDeviation(data.percentages),
        ...calculateRange(data.percentages),
      },
    };
  });

  // Find category with highest variance
  const categoryVariances = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      variance: stats.percentages.variance,
      stdDev: stats.percentages.stdDev,
    }))
    .sort((a, b) => b.variance - a.variance);

  // Generate report
  const report = generateReport(
    successfulResults,
    results,
    overallStats,
    categoryStats,
    categoryVariances,
    textAnalysis,
  );

  // Write to file
  const outputPath = path.join(process.cwd(), 'variance-test-results.txt');
  fs.writeFileSync(outputPath, report, 'utf8');

  console.log(`📝 Results written to: ${outputPath}`);
  console.log('\n🎯 Test Summary:');
  console.log(`   Successful runs: ${successfulResults.length}/10`);
  console.log(
    `   Text consistency: ${textAnalysis.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`,
  );
  console.log(`   Unique text versions: ${textAnalysis.uniqueTexts}`);
  console.log(`   Overall score variance: ${overallStats.finalPercentage.variance.toFixed(4)}`);
  console.log(`   Overall score std dev: ${overallStats.finalPercentage.stdDev.toFixed(2)}%`);
  console.log(
    `   Most variable category: ${categoryVariances[0]?.category} (std dev: ${categoryVariances[0]?.stdDev.toFixed(2)}%)`,
  );
}

function analyzeTextConsistency(successfulResults) {
  if (successfulResults.length === 0) {
    return { isConsistent: true, uniqueTexts: 0, analysis: 'No successful results to analyze' };
  }

  const textHashes = successfulResults.map((r) => r.textHash);
  const textLengths = successfulResults.map((r) => r.textLength);
  const uniqueHashes = new Set(textHashes);

  // Check if all texts are identical
  const isConsistent = uniqueHashes.size === 1;

  // Group results by text hash
  const textGroups = {};
  successfulResults.forEach((result) => {
    const hash = result.textHash;
    if (!textGroups[hash]) {
      textGroups[hash] = {
        hash,
        runs: [],
        length: result.textLength,
        count: 0,
      };
    }
    textGroups[hash].runs.push(result.run);
    textGroups[hash].count++;
  });

  return {
    isConsistent,
    uniqueTexts: uniqueHashes.size,
    textGroups: Object.values(textGroups),
    lengthStats: {
      min: Math.min(...textLengths),
      max: Math.max(...textLengths),
      range: Math.max(...textLengths) - Math.min(...textLengths),
      mean: textLengths.reduce((sum, len) => sum + len, 0) / textLengths.length,
    },
    analysis: isConsistent
      ? 'All extraction runs produced identical text'
      : `Text extraction produced ${uniqueHashes.size} different versions`,
  };
}

function generateReport(
  successfulResults,
  allResults,
  overallStats,
  categoryStats,
  categoryVariances,
  textAnalysis,
) {
  const timestamp = new Date().toISOString();

  let report = `CV EVALUATION VARIANCE TEST RESULTS
=====================================
Test Date: ${timestamp}
CV File: public/Lebenslauf.pdf
Total Runs: ${allResults.length}
Successful Runs: ${successfulResults.length}
Failed Runs: ${allResults.length - successfulResults.length}

`;

  // Text Extraction Analysis
  report += `TEXT EXTRACTION ANALYSIS
========================
Text Consistency: ${textAnalysis.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'}
Unique Text Versions: ${textAnalysis.uniqueTexts}
Analysis: ${textAnalysis.analysis}

Text Length Statistics:
  Mean Length: ${Math.round(textAnalysis.lengthStats.mean)} characters
  Range: ${textAnalysis.lengthStats.min} - ${textAnalysis.lengthStats.max} characters
  Length Variation: ${textAnalysis.lengthStats.range} characters

`;

  // Add text group details if inconsistent
  if (!textAnalysis.isConsistent) {
    report += `Text Version Details:
`;
    textAnalysis.textGroups.forEach((group, index) => {
      report += `  Version ${index + 1} (Hash: ${group.hash}):
    Length: ${group.length} characters
    Appears in runs: ${group.runs.join(', ')}
    Frequency: ${group.count}/${successfulResults.length} (${Math.round((group.count / successfulResults.length) * 100)}%)

`;
    });
  }

  // Overall Score Analysis
  report += `OVERALL SCORE STATISTICS
========================
Final Percentage:
  Mean: ${overallStats.finalPercentage.mean.toFixed(2)}%
  Variance: ${overallStats.finalPercentage.variance.toFixed(4)}
  Standard Deviation: ${overallStats.finalPercentage.stdDev.toFixed(2)}%
  Range: ${overallStats.finalPercentage.min}% - ${overallStats.finalPercentage.max}%
  Spread: ${overallStats.finalPercentage.range.toFixed(2)}%

Total Score:
  Mean: ${overallStats.totalScore.mean.toFixed(2)}
  Variance: ${overallStats.totalScore.variance.toFixed(4)}
  Standard Deviation: ${overallStats.totalScore.stdDev.toFixed(2)}
  Range: ${overallStats.totalScore.min} - ${overallStats.totalScore.max}
  Spread: ${overallStats.totalScore.range.toFixed(2)}

`;

  // Category Analysis
  report += `CATEGORY VARIANCE ANALYSIS
==========================
Categories ranked by variance (highest to lowest):

`;

  categoryVariances.forEach((cat, index) => {
    const stats = categoryStats[cat.category];
    report += `${index + 1}. ${cat.category.toUpperCase()}
   Percentage Variance: ${cat.variance.toFixed(4)}
   Percentage Std Dev: ${cat.stdDev.toFixed(2)}%
   Score Range: ${stats.scores.min} - ${stats.scores.max} (spread: ${stats.scores.range.toFixed(2)})
   Percentage Range: ${stats.percentages.min}% - ${stats.percentages.max}% (spread: ${stats.percentages.range.toFixed(1)}%)

`;
  });

  // Detailed Category Statistics
  report += `DETAILED CATEGORY STATISTICS
============================
`;

  Object.entries(categoryStats).forEach(([category, stats]) => {
    report += `${category.toUpperCase()}:
  Scores: Mean=${stats.scores.mean.toFixed(2)}, Variance=${stats.scores.variance.toFixed(4)}, StdDev=${stats.scores.stdDev.toFixed(2)}
  Percentages: Mean=${stats.percentages.mean.toFixed(1)}%, Variance=${stats.percentages.variance.toFixed(4)}, StdDev=${stats.percentages.stdDev.toFixed(2)}%

`;
  });

  // Raw Data
  report += `RAW DATA FROM ALL RUNS
======================
`;

  allResults.forEach((result) => {
    if (result.failed) {
      report += `Run ${result.run}: FAILED - ${result.error}\n`;
    } else {
      report += `Run ${result.run}: ${result.overall.finalPercentage}% (${result.summary.recommendation}) - Total: ${result.overall.totalScore}/${result.overall.maxTotalScore}\n`;
      report += `  Text: ${result.textLength} chars (Hash: ${result.textHash})\n`;
      report += `  Categories: `;
      Object.entries(result.categories).forEach(([cat, score]) => {
        report += `${cat}=${score.percentage}% `;
      });
      report += `\n`;

      if (result.overall.penalties && result.overall.penalties.length > 0) {
        report += `  Penalties: ${result.overall.penalties.join(', ')}\n`;
      }
      report += `\n`;
    }
  });

  // Analysis Summary
  report += `ANALYSIS SUMMARY
================
1. Text Extraction: ${textAnalysis.isConsistent ? 'CONSISTENT - All runs extracted identical text' : `INCONSISTENT - Found ${textAnalysis.uniqueTexts} different text versions`}
2. Root Cause: ${!textAnalysis.isConsistent ? 'EXTRACTION VARIANCE - Text differences are causing evaluation variance' : 'Text is consistent, variance is in evaluation only'}
3. Most Variable Category: ${categoryVariances[0]?.category} (std dev: ${categoryVariances[0]?.stdDev.toFixed(2)}%)
4. Most Stable Category: ${categoryVariances[categoryVariances.length - 1]?.category} (std dev: ${categoryVariances[categoryVariances.length - 1]?.stdDev.toFixed(2)}%)
5. Overall Score Stability: ${getStabilityRating(overallStats.finalPercentage.stdDev)} (${overallStats.finalPercentage.stdDev.toFixed(2)}% std dev)
6. Recommendation: ${getRecommendation(textAnalysis.isConsistent, overallStats.finalPercentage.stdDev)}

Test completed at: ${timestamp}
`;

  return report;
}

// Run the test
runVarianceTest()
  .then(() => {
    console.log('\n✅ Variance test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Variance test failed:', error.message);
    process.exit(1);
  });
