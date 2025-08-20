/**
 * Setup test to verify package structure and dependencies
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';

describe('Package Setup', () => {
  test('should have correct package.json', () => {
    const packagePath = path.resolve('./package.json');
    assert.ok(fs.existsSync(packagePath), 'package.json should exist');

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    assert.strictEqual(pkg.name, '@screening/file-parser');
    assert.strictEqual(pkg.version, '1.0.0');
    assert.strictEqual(pkg.private, true);
    assert.strictEqual(pkg.type, 'module');
    assert.ok(pkg.dependencies, 'Dependencies should be defined');
    assert.ok(pkg.scripts, 'Scripts should be defined');
  });

  test('should have required directories', () => {
    const directories = [
      './src',
      './src/parsers',
      './src/utils',
      './src/config',
      './tests',
      './tests/unit',
      './tests/integration',
      './tests/fixtures',
      './docs',
      './docs/examples',
    ];

    directories.forEach((dir) => {
      assert.ok(fs.existsSync(dir), `Directory ${dir} should exist`);
    });
  });

  test('should have configuration files', () => {
    const configFiles = [
      './.gitignore',
      './.prettierrc',
      './.prettierignore',
      './eslint.config.js',
      './README.md',
    ];

    configFiles.forEach((file) => {
      assert.ok(fs.existsSync(file), `Config file ${file} should exist`);
    });
  });

  test('should have main entry points', () => {
    const entryFiles = ['./src/index.js', './src/config/defaults.js'];

    entryFiles.forEach((file) => {
      assert.ok(fs.existsSync(file), `Entry file ${file} should exist`);
    });
  });
});
