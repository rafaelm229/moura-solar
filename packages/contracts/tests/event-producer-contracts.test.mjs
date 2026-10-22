import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const testDirectory = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = resolve(testDirectory, '../../..');
const apiSource = resolve(repositoryRoot, 'apps/api/src');
const contractSource = resolve(repositoryRoot, 'packages/contracts/src');
const indexFile = resolve(contractSource, 'index.ts');

function typescriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return typescriptFiles(path);
    return entry.isFile() && path.endsWith('.ts') && !path.endsWith('.d.ts') ? [path] : [];
  });
}

function sourceFile(path) {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function propertyName(name) {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

function literalTypes(type) {
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) return [type.literal.text];
  if (ts.isUnionTypeNode(type)) return type.types.flatMap(literalTypes);
  return [];
}

function eventTypesFromDeclarations(files) {
  const eventTypes = new Set();
  for (const path of files) {
    const root = sourceFile(path);
    function visit(node) {
      if (ts.isPropertySignature(node) && propertyName(node.name) === 'eventType' && node.type) {
        for (const type of literalTypes(node.type)) eventTypes.add(type);
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
  }
  return eventTypes;
}

function producerEventTypes(files) {
  const eventTypes = new Set();
  for (const path of files) {
    const root = sourceFile(path);
    function visit(node) {
      if (
        ts.isPropertyAssignment(node) &&
        propertyName(node.name) === 'eventType' &&
        ts.isStringLiteral(node.initializer)
      ) {
        eventTypes.add(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
  }
  return eventTypes;
}

function exportedParsers(files, knownEventTypes) {
  const parsers = new Map();
  for (const path of files) {
    const root = sourceFile(path);
    function visit(node) {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text.startsWith('parse') &&
        node.name.text.endsWith('EventV1') &&
        node.body &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const eventTypes = new Set();
        function visitBody(child) {
          if (ts.isStringLiteral(child) && knownEventTypes.has(child.text)) {
            eventTypes.add(child.text);
          }
          ts.forEachChild(child, visitBody);
        }
        visitBody(node.body);
        parsers.set(node.name.text, eventTypes);
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
  }
  return parsers;
}

function exportedNames(path) {
  const names = new Set();
  const root = sourceFile(path);
  function visit(node) {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) names.add(element.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return names;
}

const apiFiles = typescriptFiles(apiSource);
const contractFiles = typescriptFiles(contractSource);
const contractEventTypes = eventTypesFromDeclarations(contractFiles);
const producerTypes = producerEventTypes(apiFiles);
const parsers = exportedParsers(contractFiles, contractEventTypes);
const parserExports = exportedNames(indexFile);

function sorted(values) {
  return [...values].sort();
}

test('API outbox producers and versioned contract declarations cover the same event types', () => {
  assert.deepEqual(sorted(producerTypes), sorted(contractEventTypes));
});

test('every API-produced event type appears in an exported v1 parser', () => {
  const parsedTypes = new Set([...parsers.values()].flatMap((types) => [...types]));
  assert.deepEqual(sorted(parsedTypes), sorted(producerTypes));
});

test('every exported v1 parser is re-exported by the contracts package', () => {
  assert.deepEqual(
    sorted(parsers.keys()),
    sorted(
      [...parserExports].filter((name) => name.endsWith('EventV1') && name.startsWith('parse')),
    ),
  );
});
