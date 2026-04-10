// Gmail Reorganization Config for ddump33@gmail.com
// Edit this file to adjust the plan BEFORE running the reorg script.

module.exports = {
  // ──────────────────────────────────────────────────────────
  // 1. LABELS TO CREATE (parent/child uses "/" — Gmail nests automatically)
  // ──────────────────────────────────────────────────────────
  labelsToCreate: [
    // Promptizy project
    'Promptizy',
    'Promptizy/New Users',
    'Promptizy/Supabase',
    'Promptizy/Vercel',
    'Promptizy/Resend',
    'Promptizy/Google Ads',
    'Promptizy/Stripe',
    'Promptizy/Domains & DNS',
    'Promptizy/Other Tools',

    // Kids
    'Kids',
    'Kids/Livie',        // Houston Middle
    'Kids/Kobie',        // Houston High
    'Kids/Both',

    // Homes
    'Homes',
    'Homes/Glenalden',   // current — 2081 Glenalden
    'Homes/Past',

    // Finance
    'Finance',
    'Finance/Statements',
    'Finance/Taxes',

    // Personal
    'Personal/Subscriptions',
    'Personal/Medical',

    // Action system
    'Action',
    'Action/To-Do',

    // Newsletters
    'Newsletters',
    'Newsletters/AI Industry',
    'Newsletters/Retail',
  ],

  // ──────────────────────────────────────────────────────────
  // 2. LABELS TO RENAME (preserves messages — only the label name changes)
  // Format: { from: 'oldName', to: 'newName' }
  // ──────────────────────────────────────────────────────────
  labelsToRename: [
    // Existing home labels → nest under Homes/Past
    { from: 'Dogwood Oaks', to: 'Homes/Past/Dogwood Oaks' },
    { from: 'Hundred Oaks', to: 'Homes/Past/Hundred Oaks' },
    { from: 'Brachton', to: 'Homes/Past/Brachton' },

    // Existing vacation/trip labels → nest under Homes
    { from: 'Santa Rosa Beach Home', to: 'Homes/Santa Rosa Beach' },
    { from: 'Beaver Creek Trip', to: 'Homes/Beaver Creek' },

    // Existing Action-type labels → nest under Action
    { from: 'Needs Reply', to: 'Action/Needs Reply' },
    { from: 'Waiting', to: 'Action/Waiting On' },
    { from: 'FYI', to: 'Action/FYI' },
    { from: '(a)Follow-Ups', to: 'Action/Follow-Ups' },

    // Finance
    { from: 'Receipts', to: 'Finance/Receipts' },

    // Personal
    { from: 'Travel', to: 'Personal/Travel' },
    { from: 'Personal', to: 'Personal/Misc' }, // avoid collision with new Personal/* parent
  ],

  // ──────────────────────────────────────────────────────────
  // 3. LABEL MERGES (move all messages from source → target, then delete source)
  // ──────────────────────────────────────────────────────────
  labelMerges: [
    { from: '(a)To-Do\'s',                to: 'Action/To-Do' },
    { from: 'To Do',                      to: 'Action/To-Do' },
    { from: 'Kobie & Livie action items', to: 'Action/To-Do', alsoApply: 'Kids/Both' },
    { from: 'Kids Activities',            to: 'Kids/Both' },
    { from: 'Kobie School',               to: 'Kids/Kobie' },
    { from: 'Livie School',               to: 'Kids/Livie' },
    { from: 'HOA / Home',                 to: 'Homes/Glenalden' },
    { from: 'Promotion',                  to: 'Newsletters' },
  ],

  // ──────────────────────────────────────────────────────────
  // 4. FILTERS (auto-apply to incoming mail)
  // Each: { query, addLabels, removeLabels?, markRead? }
  // "skipInbox: true" removes INBOX label
  // ──────────────────────────────────────────────────────────
  filters: [
    // ── Promptizy ──
    // New user signups — keep visible (unread) but out of inbox
    { query: 'from:hello@promptizy.ai subject:"New Promptizy user"',
      addLabels: ['Promptizy/New Users'], skipInbox: true },

    { query: 'from:(noreply@supabase.io OR noreply@supabase.com OR no-reply@mail.supabase.io)',
      addLabels: ['Promptizy/Supabase'], skipInbox: true },

    // Vercel — skip inbox EXCEPT when "Failed" in subject (keeps prod alerts visible)
    { query: 'from:@vercel.com -subject:Failed',
      addLabels: ['Promptizy/Vercel'], skipInbox: true },
    { query: 'from:@vercel.com subject:Failed',
      addLabels: ['Promptizy/Vercel'] },

    { query: 'from:(@resend.com OR @resend.dev)',
      addLabels: ['Promptizy/Resend'], skipInbox: true },

    { query: 'from:(googleads-noreply@google.com OR noreply-adsense@google.com OR adwords-noreply@google.com)',
      addLabels: ['Promptizy/Google Ads'] },

    { query: 'from:@stripe.com',
      addLabels: ['Promptizy/Stripe'] },

    { query: 'from:(@cloudflare.com OR @namecheap.com OR @godaddy.com)',
      addLabels: ['Promptizy/Domains & DNS'] },

    { query: 'from:(contact@theresanaiforthat.com OR @peerlist.io)',
      addLabels: ['Promptizy/Other Tools'], skipInbox: true },

    // ── Kids / Schools (Schoology is the platform both schools use) ──
    { query: 'from:no-reply@schoology.com subject:"Houston Middle"',
      addLabels: ['Kids/Livie'] },
    { query: 'from:no-reply@schoology.com subject:"Houston High"',
      addLabels: ['Kids/Kobie'] },
    // GMSD district-wide mail → Kids/Both (both kids are GMSD)
    { query: 'from:(@gmsdk12.net OR @gmsdschools.org)',
      addLabels: ['Kids/Both'] },

    // ── Current home — Glenalden ──
    { query: 'subject:Glenalden OR from:Notice@calibersoftware.email OR from:@wrightpm.com',
      addLabels: ['Homes/Glenalden'] },
    // Nextdoor — Glenalden neighbors only (archive, keep in label)
    { query: 'from:@nextdoor.com subject:Glenalden',
      addLabels: ['Homes/Glenalden'], skipInbox: true, markRead: true },
    // Nextdoor generic trending/local news → archive to Newsletters
    { query: 'from:@nextdoor.com -subject:Glenalden',
      addLabels: ['Newsletters'], skipInbox: true, markRead: true },

    // ── TikTok — pure noise, silence ──
    { query: 'from:@service.tiktok.com',
      addLabels: ['Newsletters'], skipInbox: true, markRead: true },

    // ── Netflix / streaming ──
    { query: 'from:(@members.netflix.com OR @spotify.com OR @hulumail.com OR @disneyplus.com)',
      addLabels: ['Personal/Subscriptions'], skipInbox: true },

    // ── Finance ──
    { query: 'subject:(receipt OR invoice OR "payment received" OR "your order")',
      addLabels: ['Finance/Receipts'] },
    { query: 'subject:(statement OR "monthly statement" OR "account statement")',
      addLabels: ['Finance/Statements'] },

    // ── AI industry newsletters (keep but archive) ──
    { query: 'from:(@comms.runwayml.com OR @gamma.app OR @mail.apollo.io OR @learn.heygen.com OR hello@justyn.ca)',
      addLabels: ['Newsletters/AI Industry'], skipInbox: true, markRead: true },

    // ── Retail promos (keep but archive) ──
    { query: 'from:(@em.target.com OR @info.email.ikea.com OR @mail.wholefoodsmarket.com OR @news.on.com OR welcome@tenthousand.cc OR send@goldhinge.com OR @emails.synchrony.com)',
      addLabels: ['Newsletters/Retail'], skipInbox: true, markRead: true },
  ],

  // ──────────────────────────────────────────────────────────
  // 5. RETROACTIVE RELABELING
  // Applies filter rules to EXISTING mail after filters are created.
  // Uses the same filter queries above. Set retroactive: false on a filter to skip.
  // ──────────────────────────────────────────────────────────
  retroactive: true,
  retroactiveBatchSize: 500,

  // ──────────────────────────────────────────────────────────
  // 6. UNSUBSCRIBE CANDIDATES (script generates an HTML click-list; does NOT auto-click)
  // ──────────────────────────────────────────────────────────
  unsubscribeCandidates: [
    'notification@service.tiktok.com',
    'no-reply@rs.email.nextdoor.com',          // keep Glenalden-specific only
    'targetnews@em.target.com',
    'wholefoodsmarket@mail.wholefoodsmarket.com',
    'information@info.email.ikea.com',
    'uber@uber.com',                            // promos only, keep receipts
    'noreply@uber.com',
    'welcome@tenthousand.cc',
    'send@goldhinge.com',
    'on@news.on.com',
    'cardholder@emails.synchrony.com',
    'loyalty@loyalty.ms.aa.com',
    'info@e.equifax.com',
    'noreply@petonevet.com',
    'support@smallwoodhome.com',
    'webinar@learn.heygen.com',
    'hello@gamma.app',
    'no-reply@comms.runwayml.com',
    'hello@mail.apollo.io',
    'hello@justyn.ca',
    'info@moshmemphis.com',
    'orders@hogsfly.com',
    'NationalCarRental@email.nationalcar.com',
    'rescueme@rescueme.org',
    'noreply@hello.chamberlain.com',
    'newsletters@e.trekbikes.com',
  ],
};
