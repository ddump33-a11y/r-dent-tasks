#!/usr/bin/env node
// Gmail Reorganization — main executor
//
// USAGE:
//   node scripts/gmail-reorg/reorg.js            (dry-run — shows what would happen)
//   node scripts/gmail-reorg/reorg.js --execute  (actually applies changes)
//   node scripts/gmail-reorg/reorg.js --only=labels     (phase: labels only)
//   node scripts/gmail-reorg/reorg.js --only=renames
//   node scripts/gmail-reorg/reorg.js --only=merges
//   node scripts/gmail-reorg/reorg.js --only=filters
//   node scripts/gmail-reorg/reorg.js --only=retro      (retroactive relabeling)
//   node scripts/gmail-reorg/reorg.js --only=unsubs     (generate unsubscribe report)
//
// Run phases individually in the order above on first run. Default runs all phases.

const { google } = require('googleapis');
const { authorize } = require('./auth');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes('--execute');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || 'all';

const log = {
  header: (t) => console.log(`\n━━━ ${t} ${'━'.repeat(Math.max(0, 60 - t.length))}`),
  ok:     (t) => console.log(`  ✓ ${t}`),
  skip:   (t) => console.log(`  — ${t}`),
  warn:   (t) => console.log(`  ⚠ ${t}`),
  err:    (t) => console.log(`  ✗ ${t}`),
  info:   (t) => console.log(`  · ${t}`),
  dry:    (t) => console.log(`  [DRY] ${t}`),
};

function action(msg) { (DRY_RUN ? log.dry : log.ok)(msg); }

async function main() {
  console.log(`\nGmail Reorganization  —  mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}  phase: ${ONLY}\n`);
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  // ── Load current labels once ──
  const labelMap = await loadLabels(gmail);
  log.info(`Found ${Object.keys(labelMap).length} existing labels`);

  if (ONLY === 'all' || ONLY === 'labels')  await phaseCreateLabels(gmail, labelMap);
  if (ONLY === 'all' || ONLY === 'renames') await phaseRenameLabels(gmail, labelMap);
  if (ONLY === 'all' || ONLY === 'merges')  await phaseMergeLabels(gmail, labelMap);
  if (ONLY === 'all' || ONLY === 'filters') await phaseCreateFilters(gmail, labelMap);
  if (ONLY === 'all' || ONLY === 'retro')   await phaseRetroactive(gmail, labelMap);
  if (ONLY === 'all' || ONLY === 'unsubs')  await phaseUnsubscribeReport(gmail);

  console.log(`\n${DRY_RUN ? '(dry run complete — re-run with --execute to apply)' : '✓ Reorg complete.'}\n`);
}

// ─────────────────────────────────────────────────────────────
async function loadLabels(gmail) {
  const res = await gmail.users.labels.list({ userId: 'me' });
  const map = {};
  for (const l of res.data.labels || []) map[l.name] = l.id;
  return map;
}

async function ensureLabel(gmail, name, labelMap) {
  if (labelMap[name]) return labelMap[name];
  if (DRY_RUN) {
    log.dry(`would create label: ${name}`);
    labelMap[name] = `DRY_${name}`;
    return labelMap[name];
  }
  const res = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  });
  labelMap[name] = res.data.id;
  log.ok(`created label: ${name}`);
  return res.data.id;
}

// ─────────────────────────────────────────────────────────────
async function phaseCreateLabels(gmail, labelMap) {
  log.header('PHASE 1 — Create labels');
  for (const name of config.labelsToCreate) {
    if (labelMap[name]) { log.skip(`exists: ${name}`); continue; }
    await ensureLabel(gmail, name, labelMap);
  }
}

// ─────────────────────────────────────────────────────────────
async function phaseRenameLabels(gmail, labelMap) {
  log.header('PHASE 2 — Rename labels (preserves messages)');
  for (const { from, to } of config.labelsToRename) {
    const id = labelMap[from];
    if (!id) { log.skip(`"${from}" not found — skipping rename`); continue; }
    if (labelMap[to]) { log.warn(`target "${to}" already exists — will MERGE instead in phase 3`); continue; }
    action(`rename "${from}" → "${to}"`);
    if (!DRY_RUN) {
      await gmail.users.labels.patch({
        userId: 'me', id,
        requestBody: { name: to },
      });
      labelMap[to] = id;
      delete labelMap[from];
    }
  }
}

// ─────────────────────────────────────────────────────────────
async function phaseMergeLabels(gmail, labelMap) {
  log.header('PHASE 3 — Merge redundant labels');
  for (const merge of config.labelMerges) {
    const srcId = labelMap[merge.from];
    if (!srcId) { log.skip(`"${merge.from}" not found — skipping merge`); continue; }
    const dstId = await ensureLabel(gmail, merge.to, labelMap);
    const extraId = merge.alsoApply ? await ensureLabel(gmail, merge.alsoApply, labelMap) : null;

    // Find all messages with source label
    const q = `label:"${merge.from}"`;
    const msgIds = await searchAllMessages(gmail, q);
    log.info(`"${merge.from}" has ${msgIds.length} messages → "${merge.to}"${extraId ? ` + "${merge.alsoApply}"` : ''}`);

    if (msgIds.length > 0) {
      action(`relabel ${msgIds.length} msgs from "${merge.from}" → "${merge.to}"`);
      if (!DRY_RUN) {
        await batchModify(gmail, msgIds, {
          addLabelIds: extraId ? [dstId, extraId] : [dstId],
          removeLabelIds: [srcId],
        });
      }
    }

    action(`delete empty label "${merge.from}"`);
    if (!DRY_RUN) {
      try { await gmail.users.labels.delete({ userId: 'me', id: srcId }); delete labelMap[merge.from]; }
      catch (e) { log.err(`failed to delete "${merge.from}": ${e.message}`); }
    }
  }
}

// ─────────────────────────────────────────────────────────────
async function phaseCreateFilters(gmail, labelMap) {
  log.header('PHASE 4 — Create Gmail filters (for incoming mail)');
  // List existing filters so we don't duplicate
  const existing = await gmail.users.settings.filters.list({ userId: 'me' }).catch(() => ({ data: { filter: [] } }));
  const existingQueries = new Set((existing.data.filter || []).map((f) => JSON.stringify(f.criteria)));

  for (const f of config.filters) {
    const criteria = { query: f.query };
    if (existingQueries.has(JSON.stringify(criteria))) { log.skip(`filter exists: ${f.query}`); continue; }

    const addLabelIds = [];
    for (const labelName of f.addLabels || []) {
      addLabelIds.push(await ensureLabel(gmail, labelName, labelMap));
    }
    const removeLabelIds = [];
    if (f.skipInbox) removeLabelIds.push('INBOX');
    if (f.markRead) removeLabelIds.push('UNREAD');

    action(`filter: ${f.query}  →  +[${(f.addLabels || []).join(', ')}]${f.skipInbox ? ' (skip inbox)' : ''}${f.markRead ? ' (mark read)' : ''}`);
    if (!DRY_RUN) {
      try {
        await gmail.users.settings.filters.create({
          userId: 'me',
          requestBody: { criteria, action: { addLabelIds, removeLabelIds } },
        });
      } catch (e) {
        log.err(`filter failed (${f.query}): ${e.message}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
async function phaseRetroactive(gmail, labelMap) {
  if (!config.retroactive) { log.skip('retroactive disabled in config'); return; }
  log.header('PHASE 5 — Retroactively apply filter rules to existing mail');

  for (const f of config.filters) {
    const msgIds = await searchAllMessages(gmail, f.query);
    if (msgIds.length === 0) { log.skip(`no matches: ${f.query}`); continue; }

    const addLabelIds = [];
    for (const labelName of f.addLabels || []) addLabelIds.push(await ensureLabel(gmail, labelName, labelMap));
    const removeLabelIds = [];
    if (f.skipInbox) removeLabelIds.push('INBOX');
    if (f.markRead) removeLabelIds.push('UNREAD');

    action(`retro-relabel ${msgIds.length} msgs: ${f.query}`);
    if (!DRY_RUN) {
      await batchModify(gmail, msgIds, { addLabelIds, removeLabelIds });
    }
  }
}

// ─────────────────────────────────────────────────────────────
async function phaseUnsubscribeReport(gmail) {
  log.header('PHASE 6 — Unsubscribe report');
  const rows = [];
  for (const sender of config.unsubscribeCandidates) {
    const count = await countMessages(gmail, `from:${sender}`);
    const newest = await newestMessageFrom(gmail, sender);
    rows.push({ sender, count, newest });
    log.info(`${sender} — ${count} messages`);
  }

  const html = buildUnsubHtml(rows);
  const outPath = path.resolve(__dirname, 'unsubscribe-report.html');
  fs.writeFileSync(outPath, html);
  log.ok(`report written: ${outPath}`);
  log.info('Open the report, click each unsubscribe link, check it off.');
}

// ── helpers ──────────────────────────────────────────────────
async function searchAllMessages(gmail, query) {
  const ids = [];
  let pageToken = undefined;
  do {
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 500, pageToken });
    for (const m of res.data.messages || []) ids.push(m.id);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return ids;
}

async function countMessages(gmail, query) {
  // Fast-ish count — we just page through IDs
  const ids = await searchAllMessages(gmail, query);
  return ids.length;
}

async function newestMessageFrom(gmail, sender) {
  const res = await gmail.users.messages.list({ userId: 'me', q: `from:${sender}`, maxResults: 1 });
  if (!res.data.messages || !res.data.messages[0]) return null;
  const full = await gmail.users.messages.get({ userId: 'me', id: res.data.messages[0].id, format: 'metadata', metadataHeaders: ['Subject', 'List-Unsubscribe', 'Date'] });
  const headers = {};
  for (const h of full.data.payload.headers || []) headers[h.name.toLowerCase()] = h.value;
  return { subject: headers.subject, listUnsub: headers['list-unsubscribe'], date: headers.date };
}

async function batchModify(gmail, ids, mods) {
  const CHUNK = config.retroactiveBatchSize || 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: chunk,
        addLabelIds: mods.addLabelIds || [],
        removeLabelIds: mods.removeLabelIds || [],
      },
    });
    log.info(`  batchModify: ${i + chunk.length}/${ids.length}`);
  }
}

function buildUnsubHtml(rows) {
  rows.sort((a, b) => b.count - a.count);
  const items = rows.map((r) => {
    let link = '';
    if (r.newest && r.newest.listUnsub) {
      const match = r.newest.listUnsub.match(/<(https?:[^>]+)>/);
      if (match) link = `<a href="${match[1]}" target="_blank">Unsubscribe</a>`;
      else {
        const mail = r.newest.listUnsub.match(/<(mailto:[^>]+)>/);
        if (mail) link = `<a href="${mail[1]}">Unsub via email</a>`;
      }
    }
    return `<tr>
      <td><input type="checkbox"></td>
      <td><code>${r.sender}</code></td>
      <td style="text-align:right">${r.count}</td>
      <td>${r.newest ? (r.newest.subject || '').replace(/</g,'&lt;') : ''}</td>
      <td>${link}</td>
    </tr>`;
  }).join('\n');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribe list</title>
<style>
body{font:14px -apple-system,Segoe UI,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#222}
h1{border-bottom:1px solid #ddd;padding-bottom:.5rem}
table{width:100%;border-collapse:collapse}
th,td{padding:.5rem;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#f6f6f6}
code{background:#f3f3f3;padding:2px 4px;border-radius:3px}
a{color:#0b5fff}
</style></head><body>
<h1>Unsubscribe candidates for ddump33@gmail.com</h1>
<p>Click each "Unsubscribe" link, then check it off. Some may require visiting the sender's preferences page.</p>
<table>
<thead><tr><th></th><th>Sender</th><th># Emails</th><th>Latest subject</th><th>Action</th></tr></thead>
<tbody>${items}</tbody>
</table></body></html>`;
}

main().catch((e) => { console.error('\n✗ FAILED:', e.message); process.exit(1); });
