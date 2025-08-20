/**
 * Basic usage example for @screening/file-parser
 */

async function basicUsageExample() {
  console.log('File Parser Basic Usage Example');
  console.log('=================================\n');

  try {
    // Example 1: Parse a file (this would work once parsers are implemented)
    console.log('1. Basic file parsing:');
    console.log('const result = await FileParser.parse(file);');
    console.log('console.log(result.data.text);\n');

    // Example 2: Parse with options
    console.log('2. Parse with options:');
    console.log(`const result = await FileParser.parse(file, {
  type: 'pdf',
  extractMetadata: true,
  maxSize: 10 * 1024 * 1024,
  onProgress: (progress) => console.log(\`\${progress}%\`)
});\n`);

    // Example 3: Error handling
    console.log('3. Error handling:');
    console.log(`try {
  const result = await FileParser.parse(file);
  if (result.success) {
    console.log('Parsed successfully:', result.data.text);
  }
} catch (error) {
  console.error('Parse error:', error.message);
}\n`);

    // Example 4: Check supported formats
    console.log('4. Check supported formats:');
    console.log('const formats = FileParser.getSupportedTypes();');
    console.log('console.log(formats);\n');

    console.log('Note: This example shows the API once parsers are implemented.');
    console.log('Run after completing the parser implementation tasks.');
  } catch (error) {
    console.error('Example error:', error.message);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample();
}
