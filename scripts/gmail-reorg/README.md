# Gmail Reorg Script — ddump33@gmail.com

Reorganizes your personal Gmail into a nested label structure, creates auto-routing filters, retroactively relabels existing mail, and generates an unsubscribe click-list.

**Safe by default — runs in dry-run mode unless you pass `--execute`.**

---

## One-Time Setup (~5 min)

### 1. Get Google OAuth credentials
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new project (or pick an existing one)
3. Enable the **Gmail API** for the project (APIs & Services → Library → Gmail API → Enable)
4. **APIs & Services → OAuth consent screen** → External → fill minimum fields → add your `ddump33@gmail.com` as a test user
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
6. Application type: **Desktop app** → name it anything → Create
7. Click **Download JSON** on the new client
8. Save that file as: `scripts/gmail-reorg/.gmail-credentials.json`

> This file is gitignored — it never gets committed.

### 2. First run (authorize + dry run)
```bash
npm run gmail:reorg
```

- First run prints a URL — click it, approve access, paste the code back in the terminal.
- A refresh token gets saved to `.gmail-token.json` (also gitignored).
- The script then runs in **dry-run mode** and prints everything it *would* do without changing anything.

**Read the dry-run output carefully.** If something looks wrong, edit `config.js` and re-run.

### 3. Execute for real
```bash
npm run gmail:reorg:execute
```

That's it. The script will:
1. Create new labels
2. Rename existing labels
3. Merge redundant labels (e.g. `To Do` + `(a)To-Do's` → `Action/To-Do`)
4. Create Gmail filters for incoming mail
5. Retroactively apply those filters to existing mail
6. Generate an `unsubscribe-report.html` you can open in a browser and click through

---

## Running Individual Phases

If you want to be extra-cautious, run one phase at a time:

```bash
node scripts/gmail-reorg/reorg.js --only=labels --execute    # just create labels
node scripts/gmail-reorg/reorg.js --only=renames --execute   # just rename
node scripts/gmail-reorg/reorg.js --only=merges --execute    # merge redundant labels
node scripts/gmail-reorg/reorg.js --only=filters --execute   # create filters
node scripts/gmail-reorg/reorg.js --only=retro --execute     # retro relabel existing mail
node scripts/gmail-reorg/reorg.js --only=unsubs --execute    # generate unsubscribe report
```

**Recommended order on first real run:** `labels` → `renames` → `merges` → `filters` → `retro` → `unsubs`

---

## What It Does

### New label structure
```
Promptizy/
  ├─ New Users              ← signup notifications (skip inbox, stay unread so count is visible)
  ├─ Supabase
  ├─ Vercel                 ← Failed deploys stay in inbox, everything else filed away
  ├─ Resend
  ├─ Google Ads
  ├─ Stripe
  ├─ Domains & DNS
  └─ Other Tools

Kids/
  ├─ Livie                  ← Houston Middle (Schoology)
  ├─ Kobie                  ← Houston High (Schoology)
  └─ Both                   ← GMSD district-wide, joint comms

Homes/
  ├─ Glenalden              ← 2081 Glenalden (current home, HOA, Wright Property Mgmt)
  ├─ Santa Rosa Beach       ← renamed from "Santa Rosa Beach Home"
  ├─ Beaver Creek           ← renamed from "Beaver Creek Trip"
  └─ Past/
      ├─ Dogwood Oaks       ← archive, preserved
      ├─ Hundred Oaks       ← archive, preserved
      └─ Brachton           ← archive, preserved

Finance/
  ├─ Receipts               ← renamed from "Receipts"
  ├─ Statements
  └─ Taxes

Personal/
  ├─ Travel                 ← renamed from "Travel"
  ├─ Subscriptions
  ├─ Medical
  └─ Misc                   ← renamed from "Personal"

Action/
  ├─ To-Do                  ← merged "(a)To-Do's" + "To Do"
  ├─ Needs Reply            ← renamed from "Needs Reply"
  ├─ Waiting On             ← renamed from "Waiting"
  ├─ Follow-Ups             ← renamed from "(a)Follow-Ups"
  └─ FYI                    ← renamed from "FYI"

Newsletters/
  ├─ AI Industry            ← HeyGen, Runway, Gamma, Apollo, Justyn
  └─ Retail                 ← Target, IKEA, Whole Foods, etc.
```

### Filters created (high level)
See `config.js` for the full list. Key behaviors:
- **Promptizy signups** → skip inbox, stay unread (count visible in sidebar)
- **Vercel failed deploys** → stay in inbox (you need to see these)
- **Vercel non-failures** → skip inbox, label only
- **Nextdoor Glenalden** → keep, label as Homes/Glenalden, archive
- **Nextdoor non-Glenalden** → silence (archive + mark read + Newsletters label)
- **TikTok** → silence entirely
- **Schoology Houston Middle** → Kids/Livie
- **Schoology Houston High** → Kids/Kobie

---

## Safety Notes

- **All reversible.** Every destructive action (merge, delete label) is preceded by relabeling — nothing is permanently lost.
- **Labels you explicitly want kept are preserved** (Dogwood Oaks, Hundred Oaks, Brachton, Beaver Creek, Santa Rosa Beach) — only renamed to nest under `Homes/`.
- **Unsubscribes are NOT auto-clicked.** You get an HTML report with one-click unsubscribe links to review and click yourself.
- **Dry-run by default.** You have to pass `--execute` to change anything.
- **Batches.** Retroactive relabeling uses `messages.batchModify` in chunks of 500 (respects Gmail API quotas).

---

## Troubleshooting

- **"Missing .gmail-credentials.json"** → You skipped step 1 of setup.
- **"invalid_grant"** → Delete `.gmail-token.json` and re-run to re-authorize.
- **"insufficient authentication scopes"** → Delete `.gmail-token.json`, the scopes may have changed, re-run.
- **Rate limits** → Gmail allows 250 quota units/user/second. `batchModify` is 50 units per batch; the script is well within limits but may slow down on very large mailboxes.

---

## Customization

Edit `config.js` to:
- Add/remove labels in `labelsToCreate`
- Add/remove rename mappings in `labelsToRename`
- Add/remove merges in `labelMerges`
- Add/remove/edit filters in `filters`
- Add senders to `unsubscribeCandidates`

Re-run with `--execute` after editing. Already-created labels/filters will be skipped automatically.
