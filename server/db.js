/* =========================================================
   MySQL connection pool.

   Connection settings come from environment variables:
     • locally: server/.env (copy server/.env.example)
     • on Vercel: Project → Settings → Environment Variables

     DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
     DB_SSL_CA   the server's CA certificate (PEM text). Cloud
                 databases such as Aiven require an encrypted
                 connection; set this and the connection uses TLS
                 and checks the server's certificate against it.
   ========================================================= */

import mysql from "mysql2/promise";

/* On Vercel nothing works until DB_HOST is set; until then the API reports
   "no database" and the app stays on browser storage. */
export const configured = !!process.env.DB_HOST || !process.env.VERCEL;

/* Rebuild the certificate as a clean PEM whatever shape it was pasted in:
   with line breaks, with "\n" escapes, or squashed onto one line (a
   single-line input field drops the breaks). Each certificate's base64 body
   is re-wrapped at 64 characters. */
function normalisePem(text) {
  const blocks = String(text).replace(/\\n/g, "\n")
    .match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g);
  if (!blocks) return null;
  return blocks.map((block) => {
    const body = block
      .replace("-----BEGIN CERTIFICATE-----", "")
      .replace("-----END CERTIFICATE-----", "")
      .replace(/[^A-Za-z0-9+/=]/g, "");
    return "-----BEGIN CERTIFICATE-----\n" + body.match(/.{1,64}/g).join("\n") + "\n-----END CERTIFICATE-----";
  }).join("\n") + "\n";
}

const ca = process.env.DB_SSL_CA ? normalisePem(process.env.DB_SSL_CA) : null;

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "synora_app",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "synora",
  ssl: ca ? { ca, rejectUnauthorized: true } : undefined,
  /* Serverless functions start many small instances; keep each one's
     share of the database's connection limit small. */
  connectionLimit: process.env.VERCEL ? 2 : 5,
  connectTimeout: 10000,
  /* Store and read every DATETIME as UTC, and get DATE / TIME / DATETIME
     back as plain strings: the app keeps dates as ISO strings, and string
     values avoid any timezone shift on the way back. */
  timezone: "Z",
  dateStrings: true,
});

/* MySQL's own clock (CURRENT_TIMESTAMP, NOW()) must use UTC too, or rows it
   fills in (users.created_at) would be in the server's time zone while the
   app's timestamps are UTC. */
pool.pool.on("connection", (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

/* Run fn(connection) inside one transaction: either every statement
   commits or none does. */
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
