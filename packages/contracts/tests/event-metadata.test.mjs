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

function contractMetadataByEventType() {
  const config = ts.readConfigFile(contractConfig, ts.sys.readFile);
  assert.equal(config.error, undefined, 'contracts TypeScript config should load');
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve(contractSource, '..'),
  );
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const metadataByEventType = new Map();

  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(contractSource)) continue;
    function visit(node) {
      if (ts.isTypeAliasDeclaration(node) && node.name.text.endsWith('EventV1')) {
        const contractType = checker.getTypeAtLocation(node.name);
        const properties = checker.getPropertiesOfType(contractType);
        const correlationIdProperty = properties.find(
          (property) => property.name === 'correlationId',
        );
        const hasCorrelationId = Boolean(correlationIdProperty);
        const correlationIdType = correlationIdProperty
          ? checker.getTypeOfSymbolAtLocation(correlationIdProperty, node)
          : undefined;
        const correlationIdRequiredString = Boolean(
          correlationIdProperty &&
          !(correlationIdProperty.flags & ts.SymbolFlags.Optional) &&
          correlationIdType.flags === ts.TypeFlags.String,
        );
        const schemaVersionProperty = properties.find(
          (property) => property.name === 'schemaVersion',
        );
        assert.ok(schemaVersionProperty, `${node.name.text} must declare schemaVersion`);
        const schemaVersionType = checker.getTypeOfSymbolAtLocation(schemaVersionProperty, node);
        const schemaVersion =
          schemaVersionType.flags & ts.TypeFlags.NumberLiteral
            ? schemaVersionType.value
            : undefined;
        for (const eventType of eventTypeLiterals(node.type)) {
          const existing = metadataByEventType.get(eventType);
          if (existing !== undefined) {
            assert.deepEqual(
              existing,
              { hasCorrelationId, correlationIdRequiredString, schemaVersion },
              eventType,
            );
          }
          metadataByEventType.set(eventType, {
            hasCorrelationId,
            correlationIdRequiredString,
            schemaVersion,
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
  }
  return metadataByEventType;
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

const metadataByEventType = contractMetadataByEventType();
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
      metadataByEventType.has(producer.eventType),
      `${producer.eventType} has no versioned contract type`,
    );
    assert.equal(
      Boolean(producer.correlationId),
      metadataByEventType.get(producer.eventType).hasCorrelationId,
      `${producer.eventType} correlation metadata must match its contract`,
    );
  }
});

test('every v1 event contract pins schemaVersion to literal 1', () => {
  assert.ok(metadataByEventType.size > 0);
  for (const [eventType, contract] of metadataByEventType) {
    assert.equal(contract.schemaVersion, 1, `${eventType} contract must pin schemaVersion to 1`);
  }
});

test('shared-envelope event contracts require a string correlationId', () => {
  const sharedEnvelopeContracts = [...metadataByEventType].filter(
    ([, contract]) => contract.hasCorrelationId,
  );
  assert.ok(sharedEnvelopeContracts.length > 0);
  for (const [eventType, contract] of sharedEnvelopeContracts) {
    assert.equal(
      contract.correlationIdRequiredString,
      true,
      `${eventType} contract must require correlationId as a string`,
    );
  }
});
