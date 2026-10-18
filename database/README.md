# Synora — MySQL database

Every Synora account, and everything in it, is stored in a **MySQL** database that you can
open and query in **MySQL Workbench**. That covers the profile, subjects, tasks, notes,
timetable, attendance, grades, past semesters, focus sessions, achievements and notifications.

* **The live site** ([synora-v1.vercel.app](https://synora-v1.vercel.app/)) uses a free
  **cloud MySQL** database on [Aiven](https://aiven.io/free-mysql-database). Anything anyone
  does on the live site, from any device, is saved there.
* **On your own computer** (`npm run dev`) the app can use the same cloud database, or a
  **local MySQL** of its own (part 5).

## How it fits together

```
 Browser (React app)            Vercel                                Aiven (cloud)
┌──────────────────────┐ /api/* ┌──────────────────────────────┐ SQL  ┌──────────────────┐
│ localStorage         │ ─────► │ API: serverless function     │ ───► │ MySQL: `synora`  │
│ (the working copy)   │ ◄───── │ api/index.js → server/app.js │ ◄─── │ 20 tables        │
└──────────────────────┘  JSON  └──────────────────────────────┘ TLS  └──────────────────┘
                                                                              ▲
                                                           MySQL Workbench connects here too
```

* A browser can't talk to MySQL directly, so an **API** (Node.js + Express + `mysql2`) sits in
  between. On Vercel it runs as a serverless function. On your computer the same code runs
  with `npm run server`.
* The app still works from `localStorage`, so pages open instantly. Within about half a second of
  a change, the app sends **only what changed** (items added, edited or deleted) to the API
  ([`src/lib/sync.js`](../src/lib/sync.js)), which writes it to MySQL in one transaction. Items
  added on another device are never touched by a save from a device that hasn't seen them.
* The app **re-loads from MySQL** when it opens, when the tab comes back into view and every 2
  minutes, so every device catches up with the others.
* **Signing in** loads that account's data from MySQL, so your workspace follows you to any
  browser or device. **The password never leaves the browser:** it is turned into a key there,
  and the server stores only a **bcrypt** hash of that key. **Signing out** removes the key and
  the workspace from that browser.
* **The demo account** (`arsh2309`) is saved in the database like any other account. Everyone
  who clicks *Use the demo account* shares that one workspace, so a change made there is seen
  by the next visitor. It **resets itself to fresh sample data once a day**, so its deadlines stay
  current and one visitor's changes only last until the next day.
* **Nobody ever has to sign out and back in.** If the database can't be reached (a slow
  start, Aiven powered off), the app keeps working from the browser copy. Every 30 seconds,
  and whenever the tab comes back into view, it retries. As soon as the database answers, it
  creates or links the account and uploads everything on its own.

---

## 1. Create the free cloud database (Aiven)

1. Sign up at **[aiven.io](https://aiven.io/free-mysql-database)** (free, no card needed for
   the free plan).
2. **Create service → MySQL → Free plan**. Give it a name, e.g. `synora-db`, and create it.
   Wait until its status is **Running** (a few minutes).
3. Open the service's **Overview** page and keep it open. The **Connection information**
   there has everything you need next: **Host**, **Port**, **User** (`avnadmin`), **Password**
   and the **CA certificate**. Click **Download** next to the CA certificate to save
   `ca.pem`.

> These are the keys to your database. Paste them only into Workbench and Vercel's settings.
> Never put them in a file in this repository, because the repository is public.

Aiven's free plan: 1 GB storage, 1 CPU, 1 GB RAM, no time limit. **Aiven switches off free
services that sit unused for a while** (it emails you first). If the live site stops saving to
the database, open the Aiven console and click **Power on**.

## 2. Create the tables (MySQL Workbench)

1. In Workbench, click **⊕** next to *MySQL Connections* to add a connection:
   * **Connection Name:** `Synora cloud (Aiven)`
   * **Hostname** / **Port** / **Username:** from Aiven's connection information
   * **Password:** *Store in Keychain…* → paste Aiven's password
   * **SSL** tab → **Use SSL:** `Require and Verify CA`, **SSL CA File:** the `ca.pem` you
     downloaded
   * Click **Test Connection**. It should say it connected successfully. Then click **OK**.
2. Open the connection, then **File → Open SQL Script…** → `database/schema.sql`.
3. Click the **⚡ lightning bolt**, or press **⌘ ⇧ ↵** (Mac) / **Ctrl + Shift + Enter**
   (Windows). The *Output* panel should show only green ticks.
4. In the **Navigator → Schemas** tab, click **↻ refresh**. **`synora`** appears with 20 tables.

`schema.sql` is safe to run again later. It never deletes data.

**Created the tables with an older `schema.sql`?** Nothing to do. When a new version of the
app adds tables or columns, the API adds whatever is missing to the database by itself, on
its first request after the deploy (`server/migrate.js`). Refresh Workbench to see them.

## 3. Connect the live site (Vercel)

1. Open your project on **[vercel.com](https://vercel.com)** → **Settings → Environment
   Variables**, and add these (Environment: **Production**, and **Preview** if you like):

   | Key | Value |
   | :--- | :--- |
   | `DB_HOST` | Aiven *Host* |
   | `DB_PORT` | Aiven *Port* |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | Aiven *Password* (tick **Sensitive**) |
   | `DB_NAME` | `synora` |
   | `DB_SSL_CA` | the whole contents of `ca.pem`, from `-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----` |

2. Environment variables only apply to new deployments, so go to **Deployments**, open the
   latest one's **⋯** menu and choose **Redeploy**.
3. Check it: open **https://synora-v1.vercel.app/api/health**. It should show `{"ok":true}`.
   * `{"error":"no-database"}` means the variables aren't set, or you haven't redeployed.
   * `{"error":"server-error"}` means Vercel can't reach MySQL. Check the values, and check
     that the Aiven service is running. **Logs** in Vercel shows the exact error.

From now on, **create an account on the live site** and everything you do is saved to the cloud
database.

## 4. Look at the data in Workbench

* **Browse a table:** in *Schemas → synora → Tables*, right-click a table (e.g. `tasks`) →
  **Select Rows – Limit 1000**.
* **See changes live:** add or edit something on the site, then click **↻** above the result
  grid. The change is there within a second.
* **Run the ready-made queries:** **File → Open SQL Script… → `database/queries.sql`**. It
  starts on the demo account (`SET @user = 'arsh2309';`); change that line to see another
  account. Run the first two lines once, then put the cursor inside any query and press
  **⌘ ↵** / **Ctrl + Enter**. It includes:
  * every account and row counts per user
  * **CGPA worked out in SQL** (a credit-weighted `JOIN` of `grades` and `subjects`)
  * attendance % against the target
  * overdue tasks
  * the weekly timetable in order
  * unread notifications
  * who is signed in
* **Draw the ER diagram:** **Database → Reverse Engineer…** → pick the connection → tick
  **`synora`** → *Execute*. Workbench draws every table and its foreign-key lines.

> Treat the database as something to **read** in Workbench. If you edit a row there, the app
> picks up the change the next time that account signs in. But any later change in the app
> saves its own copy of that list over yours.

---

## 5. Running it on your computer

`npm run dev` runs the app. To use a database locally as well, create **`server/.env`**
(it is git-ignored) and start the API with **`./start.sh`** / **`start.bat`** (they start
the API too once `server/.env` exists), or with `npm run server` in a second terminal.

**Option A: use the same cloud database.** Copy `server/.env.example` to `server/.env` and fill
in the Aiven values as in step 3. Put `DB_SSL_CA` on one line, writing each line break as `\n`.

**Option B: a separate local MySQL.** This is useful for experimenting without touching the
live data.

1. In Workbench, open your **Local instance** connection (user `root`), then run
   `database/schema.sql` **and then** `database/local-user.sql`. The second file creates the
   `synora_app` user, which can only connect from this computer.
2. `cp server/.env.example server/.env`. The defaults already match `local-user.sql`.

Set up a local MySQL before October 2026? Run `local-user.sql` **once more**: it now also lets
`synora_app` add tables and columns (`CREATE`, `ALTER`), which the self-upgrading schema needs.

**Copying the cloud data to your local MySQL:** in Workbench open the cloud connection, go to
**Server → Data Export**, tick `synora`, and choose *Export to Self-Contained File*. Then open
the local connection and use **Server → Data Import** with that file.

## 6. Password-reset emails (Brevo)

*Forgot password?* emails a one-time link. Until this is set up, the page simply says email
isn't available yet; everything else works.

1. Create a free account at [brevo.com](https://www.brevo.com/) (300 emails a day free).
2. **Senders, domains & dedicated IPs → Senders → Add a sender**: name `Synora`, and an email
   address you can open. Brevo emails it a code; enter it to verify the sender.
3. **SMTP & API → API keys → Generate a new API key**. Copy it (it is shown only once).
4. In **Vercel → the project → Settings → Environment Variables**, add (all environments):

   | Name | Value |
   | :--- | :--- |
   | `BREVO_API_KEY` | the key from step 3 (mark it *Sensitive*) |
   | `MAIL_FROM` | the sender address verified in step 2 |
   | `APP_URL` | optional: `https://synora-v1.vercel.app` (where the link points) |

5. **Deployments → ⋯ → Redeploy.** Test it: sign in to an account that has your email, sign
   out, choose *Forgot password?* and enter the username.

The link expires after 30 minutes and works once; only a SHA-256 hash of it is stored (table
`password_resets`). Setting a new password signs that account out everywhere. If the email
doesn't arrive, check the spam folder: mail sent from a free address (such as Gmail) through
Brevo can't be fully authenticated, and a sender on your own domain is delivered more reliably.

## 7. Push reminders with Synora closed

Class and due-today reminders reach a phone or computer even with Synora closed, once these are set:

1. **Keys.** On your computer, in the project folder, run:

   ```bash
   npx web-push generate-vapid-keys
   ```

   It prints a *Public Key* and a *Private Key*.
2. **A secret for the scheduler.** Make up a long random string (for example a password manager's
   generator, 40+ characters).
3. **Vercel → Settings → Environment Variables** (all environments):

   | Name | Value |
   | :--- | :--- |
   | `VAPID_PUBLIC_KEY` | the public key |
   | `VAPID_PRIVATE_KEY` | the private key (mark it *Sensitive*) |
   | `VAPID_SUBJECT` | optional: `mailto:` + your email |
   | `CRON_SECRET` | the secret from step 2 (*Sensitive*) |

   Then **Redeploy**.
4. **GitHub → the repository → Settings → Secrets and variables → Actions → New repository secret:**
   name `CRON_SECRET`, the same value. The *Push reminders* workflow then calls the API every
   10 minutes (Actions tab → *Push reminders* → *Run workflow* tests it straight away). Vercel's own
   daily cron (`vercel.json`) also runs it at 8 am IST as a backstop.
5. In the app: **Settings → Reminders → Turn on reminders**. The card says *Also when Synora is closed*
   when this device is subscribed; **Send a test** comes from the server. On iPhone/iPad, do this inside
   the home-screen app.

GitHub can start scheduled runs a few minutes late, so a class reminder arrives somewhere between 20
and about 5 minutes before the class.

## 8. Timetable from a photo (Anthropic)

*Timetable → Scan a photo* sends the picture to Claude, which lists the classes for you to check.

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/) (it needs a little
   prepaid credit; a scan costs around a cent).
2. In Vercel add `ANTHROPIC_API_KEY` (*Sensitive*). Optional: `SCAN_MODEL` (default `claude-sonnet-5-5`).
3. **Redeploy.** Each account can scan 15 times a day.

---

## The tables

| Table | One row per… | Notes |
| :--- | :--- | :--- |
| `users` | account | `username` is unique (case-insensitive); `password_hash` is bcrypt of the browser-derived key |
| `sessions` | signed-in browser | random 64-character token, valid 30 days; deleted on sign-out |
| `profiles` | account | avatar, program, semester, attendance target, theme, onboarding done |
| `user_meta` | account | completion streak, demo version, *Get started* checklist dismissed |
| `subjects` | subject | the list the timetable, attendance and grades point at; `color` for the UI |
| `tasks` | task | priority / status / `repeat_rule` are `ENUM`s; `subtasks` is the checklist as JSON; `subject` is the free-text name |
| `notes` | quick note | `body` is Markdown text |
| `timetable_classes` | class slot | foreign key → `subjects`; `last_marked` = the day attendance was last asked for it |
| `attendance` | tracked subject | `attended ≤ total` is enforced with a `CHECK` |
| `grades` | graded subject | `O`, `A+`, `A`, `B+`, `B` pass; `E1`, `E2`, `E3` fail |
| `achievements` | unlocked badge | badge definitions live in the app |
| `notifications` | alert | read / seen flags |
| `semesters` | completed semester | the CGPA page's semester history |
| `semester_grades` | subject in a past semester | name, credits and grade; foreign key → `semesters` (`ON DELETE CASCADE`) |
| `focus_sessions` | finished focus-timer session | subject, task, minutes, when it ended |
| `password_resets` | emailed reset link | only the SHA-256 hash of the token; expires after 30 minutes |
| `attachments` | file on a task or note | the bytes (`MEDIUMBLOB`, ≤ 3.5 MB); the task/note keeps `{ id, name, mime, size }` in its `attachments` JSON column; deleted with its task/note |
| `push_subscriptions` | browser with reminders on | Web Push endpoint and keys, plus the browser's time zone |
| `push_sent` | reminder already pushed | so each class / morning digest goes out once; kept 3 days |
| `contact_messages` | message from the landing page's contact form | not tied to an account; nothing is emailed |

* Every table except `users` has a `user_id` foreign key to `users` with **`ON DELETE
  CASCADE`**: deleting an account deletes everything it owns.
* `timetable_classes`, `attendance` and `grades` also have a foreign key to `subjects`
  (`user_id`, `subject_id`). Deleting a subject in Settings removes its classes, attendance
  and grade, in the database as well as in the app.
* Row ids are the app's own ids (e.g. `tsk-mvcnsml9-xvfdzt`), so the primary key is
  `(user_id, id)`. The `position` column keeps each list in the app's order.
* **All times are stored in UTC.** India is UTC + 5:30, so a task created at 10:47 pm IST
  shows `17:17` in Workbench.

## Security notes

* The password itself is never sent or stored. The browser derives a key from it (PBKDF2-SHA256,
  210,000 rounds, salted with the username), and the server keeps only a **bcrypt** hash of that
  key. Accounts created before the stronger key are upgraded automatically at their next sign-in.
* Signing out removes the account's key and workspace from the browser.
* Every query uses **placeholders** (`?`), so input can't change the SQL (no SQL injection).
* The live database connection is encrypted (**TLS**) and the server's certificate is checked
  against Aiven's CA.
* Password-reset links are single-use, expire after 30 minutes and are stored only as a hash.
  The *Forgot password?* answer is the same whether or not the account exists. Changing or
  resetting a password signs out the account's other sessions.
* Sign-in and sign-up are rate-limited: 20 attempts per IP address every 10 minutes per server
  instance, and at most 60 new accounts per hour for the whole site.
* Text longer than a column allows is trimmed to fit instead of failing the save. The forms
  already stop well before those limits.
* Server logs record what went wrong, never the data being saved.
* The site sends a strict Content-Security-Policy and other security headers (`vercel.json`).
* The cloud credentials live only in Vercel's environment variables, never in this repository.

## Start over

To wipe everything, run this in Workbench on the database you want to reset, then run
`schema.sql` again:

```sql
DROP DATABASE synora;
```

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| `/api/health` shows `no-database` | Add the `DB_*` variables in Vercel (step 3), then **Redeploy**. |
| `/api/health` shows `server-error` | Wrong value in Vercel, or the Aiven service is powered off: power it on in the Aiven console. |
| Workbench: *SSL connection error* | In the connection's **SSL** tab, choose `Require and Verify CA` and select Aiven's `ca.pem`. |
| Local API: `Access denied for user 'synora_app'` | Run `local-user.sql` on your local MySQL, and check `server/.env` matches it. |
| Local API: `ECONNREFUSED 127.0.0.1:3306` | Local MySQL isn't running (macOS: *System Settings → MySQL → Start*). |
| `Unknown database 'synora'` | `schema.sql` hasn't been run on that server yet. |
| `Port 4000 is already in use` | Change `API_PORT` in `server/.env`; the app follows it automatically. |
| *Forgot password?* says email isn't set up | Add `BREVO_API_KEY` and `MAIL_FROM` in Vercel (part 6), then **Redeploy**. |
| Settings says reminders with Synora closed "aren't set up" | Add the VAPID keys and `CRON_SECRET` (part 7), then **Redeploy**. |
| Reminders on, but nothing arrives with Synora closed | Check the GitHub secret `CRON_SECRET` matches Vercel's, and the *Push reminders* workflow runs green. |
| Scanning says it "isn't set up" | Add `ANTHROPIC_API_KEY` (part 8), then **Redeploy**. |
| Local API: `ALTER command denied` / `CREATE command denied` | Run `local-user.sql` again (it grants `CREATE` and `ALTER`). |
