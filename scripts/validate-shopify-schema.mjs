#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const themeArg = process.argv[2] || 'ritual';
const root = themeArg.startsWith('/') ? themeArg : join(process.cwd(), themeArg);

function decimalDigits(value) {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

function isInteger(value) {
  return Number.isInteger(value);
}

function collectLiquidFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      collectLiquidFiles(path, files);
    } else if (entry.endsWith('.liquid')) {
      files.push(path);
    }
  }
  return files;
}

function extractSchema(content, filePath) {
  const match = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    return { __parseError: error.message, __filePath: filePath };
  }
}

function validateSetting(setting, filePath) {
  const errors = [];
  const id = setting.id || '(no id)';

  if (setting.type === 'number' && Object.prototype.hasOwnProperty.call(setting, 'default')) {
    if (!isInteger(setting.default)) {
      errors.push(`${filePath}: setting "${id}" number default must be an integer (got ${setting.default})`);
    }
  }

  if (setting.type === 'range') {
    for (const key of ['min', 'max', 'step', 'default']) {
      if (!Object.prototype.hasOwnProperty.call(setting, key)) continue;
      const value = setting[key];
      if (decimalDigits(value) > 1) {
        errors.push(`${filePath}: setting "${id}" range ${key} must have 1 or less decimal digits (got ${value})`);
      }
      if (key === 'default' && !isInteger(value)) {
        errors.push(`${filePath}: setting "${id}" range default must be an integer (got ${value})`);
      }
    }

    if (
      isInteger(setting.min) &&
      isInteger(setting.max) &&
      isInteger(setting.step) &&
      setting.step > 0 &&
      (setting.max - setting.min) / setting.step > 100
    ) {
      errors.push(
        `${filePath}: setting "${id}" range must have at most 101 steps (got ${(setting.max - setting.min) / setting.step + 1})`
      );
    }
  }

  return errors;
}

function validateSchema(schema, filePath) {
  if (schema.__parseError) {
    return [`${filePath}: invalid schema JSON (${schema.__parseError})`];
  }

  const errors = [];
  const settings = [...(schema.settings || []), ...(schema.blocks || []).flatMap((block) => block.settings || [])];

  for (const setting of settings) {
    errors.push(...validateSetting(setting, relative(process.cwd(), filePath)));
  }

  return errors;
}

const files = collectLiquidFiles(root);
const errors = [];

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  const schema = extractSchema(content, filePath);
  if (!schema) continue;
  errors.push(...validateSchema(schema, filePath));
}

if (errors.length) {
  console.error('Shopify schema validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Shopify schema validation passed for ${files.length} liquid files in ${themeArg}/`);
