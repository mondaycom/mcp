/**
 * Live API check: read_docs + update_doc using local agent-toolkit CJS dist
 * (same code path as monday-api-mcp after `yarn workspace @mondaydotcomorg/agent-toolkit build`
 * and `yarn workspace @mondaydotcomorg/monday-api-mcp build`).
 *
 * Token: ~/.cursor/mcp.json → monday-api-mcp.env.MONDAY_TOKEN (never logged).
 *
 * Usage from repo root:
 *   node scripts/live-update-doc-delta-test.cjs [object_id]
 *
 * Default object_id: 18409937871
 */
'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const REPO_ROOT = join(__dirname, '..');
const { MondayAgentToolkit } = require(join(REPO_ROOT, 'packages/agent-toolkit/dist/cjs/mcp/index.js'));
const { ToolMode } = require(join(REPO_ROOT, 'packages/agent-toolkit/dist/cjs/core/index.js'));

function loadMondayTokenFromCursorMcp() {
  const home = process.env.HOME || '';
  const raw = readFileSync(join(home, '.cursor/mcp.json'), 'utf8');
  const j = JSON.parse(raw);
  const t = j?.mcpServers?.['monday-api-mcp']?.env?.MONDAY_TOKEN;
  if (!t || typeof t !== 'string') {
    throw new Error('Missing monday-api-mcp.env.MONDAY_TOKEN in ~/.cursor/mcp.json');
  }
  return t;
}

function parseMcpToolResult(result) {
  if (result?.structuredContent !== undefined) {
    return result.structuredContent;
  }
  const text = result?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Unexpected tool result shape');
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function callTool(toolkit, name, args) {
  const server = toolkit.getServer();
  const reg = server._registeredTools?.[name];
  if (!reg?.callback) {
    throw new Error(`Tool not registered: ${name}`);
  }
  return reg.callback(args, { metadata: {} });
}

async function main() {
  const objectId = process.argv[2] || '18409937871';
  const token = loadMondayTokenFromCursorMcp();
  const toolkit = new MondayAgentToolkit({
    mondayApiToken: token,
    toolsConfiguration: { mode: ToolMode.API },
  });

  console.log('--- read_docs (object_ids, include_blocks) ---');
  const readRes = await callTool(toolkit, 'read_docs', {
    mode: 'content',
    type: 'object_ids',
    ids: [objectId],
    include_blocks: true,
    limit: 1,
  });
  const readParsed = parseMcpToolResult(readRes);
  if (typeof readParsed === 'string') {
    console.log('read_docs returned non-JSON:', String(readParsed).slice(0, 500));
    process.exit(1);
  }
  const doc = readParsed?.data?.[0];
  if (!doc?.id) {
    console.log('Unexpected read_docs payload:', readParsed && Object.keys(readParsed));
    process.exit(1);
  }
  const docId = doc.id;
  const blocks = doc.blocks || [];
  const textBlock = blocks.find((b) => {
    const t = (b?.type || '').toLowerCase().replace(/\s+/g, '_');
    return (
      t === 'normal_text' ||
      t === 'large_title' ||
      t === 'medium_title' ||
      t === 'small_title' ||
      t === 'text' ||
      t === 'quote'
    );
  });
  if (!textBlock?.id) {
    console.log('No text-like block found. Types:', blocks.map((b) => b?.type).join(', '));
    process.exit(1);
  }
  const blockId = textBlock.id;
  console.log('doc_id:', docId, 'block_id:', blockId, 'block_type:', textBlock.type);

  const stamp = new Date().toISOString();

  console.log('\n--- update_doc: STRING insert (new / Quill-style) ---');
  const resString = await callTool(toolkit, 'update_doc', {
    object_id: objectId,
    operations: [
      {
        operation_type: 'update_block',
        block_id: blockId,
        content: {
          block_content_type: 'text',
          delta_format: [
            { insert: `[string-insert OK @ ${stamp}]\n` },
            { insert: '\n' },
          ],
        },
      },
    ],
  });
  console.log(parseMcpToolResult(resString));

  console.log('\n--- update_doc: OBJECT insert (previous supported shape) ---');
  const resObject = await callTool(toolkit, 'update_doc', {
    object_id: objectId,
    operations: [
      {
        operation_type: 'update_block',
        block_id: blockId,
        content: {
          block_content_type: 'text',
          delta_format: [
            { insert: { text: `[object-insert OK @ ${stamp}]\n` } },
            { insert: { text: '\n' } },
          ],
        },
      },
    ],
  });
  console.log(parseMcpToolResult(resObject));

  console.log('\nDone. Verify in UI:', `https://monday.monday.com/docs/${objectId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
