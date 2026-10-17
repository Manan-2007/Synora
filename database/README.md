# Synora — MySQL database

Every Synora account, and everything in it, is stored in a **MySQL** database that you can
open and query in **MySQL Workbench**. That covers the profile, subjects, tasks, notes,
timetable, attendance, grades, achievements and notifications.

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
│ (the working copy)   │ ◄───── │ api/index.js → server/app.js │ ◄─── │ 12 tables        │
└──────────────────────┘  JSON  └──────────────────────────────┘ TLS  └──────────────────┘
                                                                              ▲
                                                           MySQL Workbench connects here too
```

* A browser can't talk to MySQL directly, so an **API** (Node.js + Express + `mysql2`) sits in
  between. On Vercel it runs as a serverless function. On your computer the same code runs
  with `npm run server`.
* The app still works from `localStorage`, so pages open instantly. Each change is sent to
  the API within about half a second ([`src/lib/sync.js`](../src/lib/sync.js)), and the API
  writes it to MySQL in one transaction.
* **Signing in** loads that account's data from MySQL, so your workspace follows you to any
  browser or device. **The password never leaves the browser:** it is turned into a key there,
  and the server stores only a **bcrypt** hash of that key.
* **The demo account** (`arsh2309`) is saved in the database like any other account. Everyone
  who clicks *Use the demo account* shares that one workspace, so a change made there is seen
  by the next visitor. The first time it reaches the database, the shipped sample data is
  uploaded, not one browser's edited copy.
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
4. In the **Navigator → Schemas** tab, click **↻ refresh**. **`synora`** appears with 12 tables.

`schema.sql` is safe to run again later. It never deletes data.

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

**Copying the cloud data to your local MySQL:** in Workbench open the cloud connection, go to
**Server → Data Export**, tick `synora`, and choose *Export to Self-Contained File*. Then open
the local connection and use **Server → Data Import** with that file.

---

## The tables

| Table | One row per… | Notes |
| :--- | :--- | :--- |
| `users` | account | `username` is unique (case-insensitive); `password_hash` is bcrypt of the browser-derived key |
| `sessions` | signed-in browser | random 64-character token, valid 30 days; deleted on sign-out |
| `profiles` | account | avatar, program, semester, attendance target, theme, onboarding done |
| `user_meta` | account | completion streak |
| `subjects` | subject | the list the timetable, attendance and grades point at |
| `tasks` | task | priority / status are `ENUM`s; `subject` is the free-text name |
| `notes` | quick note | |
| `timetable_classes` | class slot | foreign key → `subjects` |
| `attendance` | tracked subject | `attended ≤ total` is enforced with a `CHECK` |
| `grades` | graded subject | `O`, `A+`, `A`, `B+`, `B` pass; `E1`, `E2`, `E3` fail |
| `achievements` | unlocked badge | badge definitions live in the app |
| `notifications` | alert | read / seen flags |

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

* The password itself is never sent or stored. The browser derives a key from it, and the server keeps only a **bcrypt** hash of that key.
* Every query uses **placeholders** (`?`), so input can't change the SQL (no SQL injection).
* The live database connection is encrypted (**TLS**) and the server's certificate is checked
  against Aiven's CA.
* Sign-in and sign-up are rate-limited (20 attempts per IP address every 10 minutes per server
  instance).
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
