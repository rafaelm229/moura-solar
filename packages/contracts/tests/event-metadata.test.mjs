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
const contractConfig = resolve(repositoryRoot, 'packages/contracts/tsconfig.json');

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
  if (!name) return undefined;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

function eventTypeLiterals(typeNode) {
  const values = new Set();
  function visit(node) {
    if (ts.isPropertySignature(node) && propertyName(node.name) === 'eventType' && node.type) {
      function collect(type) {
        if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
          values.add(type.literal.text);
        } else if (ts.isUnionTypeNode(type)) {
          type.types.forEach(collect);
        }
      }
      collect(node.type);
    }
    ts.forEachChild(node, visit);
  }
  visit(typeNode);
  return values;
}

function contractCorrelationByEventType() {
  const config = ts.readConfigFile(contractConfig, ts.sys.readFile);
  assert.equal(config.error, undefined, 'contracts TypeScript config should load');
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve(contractSource, '..'),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const correlationByEventType = new Map();

  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(contractSource)) continue;
    function visit(node) {
      if (ts.isTypeAliasDeclaration(node) && node.name.text.endsWith('EventV1')) {
        const contractType = checker.getTypeAtLocation(node.name);
        const hasCorrelationId = checker
          .getPropertiesOfType(contractType)
          .some((property) => property.name === 'correlationId');
        for (const eventType of eventTypeLiterals(node.type)) {
          const existing = correlationByEventType.get(eventType);
          if (existing !== undefined) assert.equal(existing, hasCorrelationId, eventType);
          correlationByEventType.set(eventType, hasCorrelationId);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return correlationByEventType;
}

function producerEventObjects() {
  const producers = [];
  for (const path of typescriptFiles(apiSource)) {
    const root = sourceFile(path);
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = new Map(
          node.properties
            .map((property) => [propertyName(property.name), property])
            .filter(([name]) => name !== undefined),
        );
        const eventTypeProperty = properties.get('eventType');
        if (eventTypeProperty && ts.isPropertyAssignment(eventTypeProperty)) {
          const initializer = eventTypeProperty.initializer;
          if (ts.isStringLiteral(initializer)) {
            producers.push({
              eventType: initializer.text,
              schemaVersion: properties.get('schemaVersion'),
              correlationId: properties.get('correlationId'),
              path,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
  }
  return producers;
}

const correlationByEventType = contractCorrelationByEventType();
const producers = producerEventObjects();

test('API event producers set schema version 1', () => {
  assert.ok(producers.length > 0);
  for (const producer of producers) {
    assert.ok(
      producer.schemaVersion,
      `${producer.eventType} in ${producer.path} lacks schemaVersion`,
    );
    assert.ok(
      ts.isPropertyAssignment(producer.schemaVersion) &&
        ts.isNumericLiteral(producer.schemaVersion.initializer) &&
        producer.schemaVersion.initializer.text === '1',
      `${producer.eventType} in ${producer.path} must use schemaVersion 1`,
    );
  }
});

test('producer correlation matches the versioned event contract shape', () => {
  for (const producer of producers) {
    assert.ok(
      correlationByEventType.has(producer.eventType),
      `${producer.eventType} has no versioned contract type`,
    );
    assert.equal(
      Boolean(producer.correlationId),
      correlationByEventType.get(producer.eventType),
      `${producer.eventType} correlation metadata must match its contract`,
    );
  }
});
