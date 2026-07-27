# VAS OS — Refactor Notes

## What changed
The app was a single 9,930-line HTML file with all CSS and ~15,000 lines of JS
inline. Every edit meant scrolling a monster file and hoping you didn't break
something 4,000 lines away.

**Nothing about how the app runs has changed.** This is a pure mechanical
split — same DOM, same CSS rules, same JS logic, same load order, same
`window.*` globals. It's still a static site with zero build step, so it
deploys to GitHub Pages / Netlify / wherever exactly like before. There is
no bundler, no npm install, no compile step — just open `index.html`.

## New structure

```
index.html              ← page shell: login screen, app DOM, all modals,
                           <link> to css/styles.css, <script src> tags
css/
  styles.css             ← everything that was in <style>...</style>
js/
  00-core-preamble.js     ← anti-inspection guard, WhatsApp/Email notif senders,
                            Notion DB id map, date/format utils (fd, fdt, fr,
                            hb, dur, gid, mkColor, mkAv, calcNextDue)
  02-ui-utils-config.js   ← toast/OM/CM/SP helpers, share sheet, Supabase config
  03-supabase-helpers.js  ← sbQ / sbInsert / sbUpdate / sbDelete, setSync
  04-member-types-perms.js← employment-type permission model (canDo, etc.)
  05-data-load.js         ← loadFromNotion (Supabase), refreshData
  06-task-db-writes.js    ← taskPayload + all nCreate*/nUpdate* DB writers
  07-notify-log.js        ← sendNotif/notifyAdmins/logAction
  08-auth-nav.js          ← login/logout, startApp, nav(), assignee picker
  09-syslog-persist.js    ← localStorage-persisted 30-day system log
  10-dashboard.js         ← rDash (member view + admin view), alert strip
  11-tasks.js             ← rMyTasks/rAllTasks/renderTasks, due-status logic
  12-todos-reminders.js   ← rTodos + todo detail panel
  13-projects.js          ← rProjects, project detail panel
  14-team-eval.js         ← rTeam, rEval, member detail panel
  15-backlog.js           ← rBacklog kanban + list views
  16-services-operators.js
  17-library.js           ← knowledge base + access-request flow
  18-docs-archive.js      ← auto-generated docs, archive with time metrics
  19-meetings.js          ← scheduling, attendance, action-item conversion
  20-service-tests.js     ← recurring QA checklist sessions per operator
  21-settings.js          ← admin config, dropdown-list editor, backups
  22-syslog-page.js       ← filterable system log UI
  23-hr-comms-announcements-reports.js
                           ← HR messaging, announcements, admin Reports +
                             per-member report generator (this section grew
                             organically under the same §23 header in the
                             original file — kept together to avoid guessing
                             at a split point inside a function)
  24-comments-page.js     ← cross-task comment inbox
  25-tutorial.js          ← interactive onboarding walkthrough
  26-task-panel.js        ← the task side-panel (open/approve/reject/etc.)
  27-modals-saves.js      ← every openXModal()/saveX() pair
  28-badges-updates.js    ← sidebar/notification badge counters
  29-init-mobile.js       ← app bootstrap, clock, mobile bottom-nav/FAB
```

Files are numbered so the load order in `index.html` is obvious at a glance
and matches the dependency order the code already assumed (e.g. `utils`
before anything that calls `fd()`, `state`/`config` before render functions).

## How to make changes now

- **Fixing/tweaking a specific screen** → open the one `js/NN-*.js` file for
  that screen. E.g. dashboard tweaks → `js/10-dashboard.js` only.
- **Adding a new page** → add a new `js/30-your-page.js`, add its `<script
  src>` line at the bottom of the list in `index.html` (after `29-init-mobile.js`
  is fine for most new render functions since `window._renders` is just a
  plain object assigned at nav-time), then wire it into the `renders` map in
  `08-auth-nav.js`'s `nav()` function and add a sidebar link in `index.html`.
- **Styling** → `css/styles.css`, same class names as before.
- **New Supabase table / DB call** → `03-supabase-helpers.js` for the raw
  helpers, `06-task-db-writes.js` (or a new file) for the payload shaping.

## Verification performed
- Concatenating all 29 `js/*.js` files in the order listed in
  `js_manifest.txt` and parsing with Node's `Function()` constructor
  succeeds with no syntax errors — confirms nothing was cut mid-statement.
- Byte-for-byte diff of `css/styles.css` against the original inline
  `<style>` block: identical.
- All original DOM (login screen, sidebar, modals, side panel, mobile nav)
  is untouched in `index.html` — only the `<style>` and inline `<script>`
  blocks were replaced with `<link>`/`<script src>` references.

## Suggested next steps (not done here, since they're judgment calls)
1. Split the two largest files further if they keep growing:
   `10-dashboard.js` (700 lines) and `23-hr-comms-announcements-reports.js`
   (905 lines, really 3 features: HR comms, announcements, reports).
2. Move the hardcoded Supabase URL/anon key and UltraMsg token in
   `02-ui-utils-config.js` into a `config.local.js` that's gitignored, and
   commit a `config.example.js` — right now they're plain-text in the repo.
3. Once the file split feels stable, consider adding a lightweight local
   dev server + a `.eslintrc` (no bundler needed) so typos get caught before
   you push, since browsers won't warn you about them.
