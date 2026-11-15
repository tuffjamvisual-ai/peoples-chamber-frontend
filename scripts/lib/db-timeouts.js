// Timeouts for every Mac script that reaches the database through the transaction pooler (DATABASE_URL, port 6543)
// (T1-MEM B, owner approved 15 Nov 2026, COWORK-TO-T1 ENTRY 116; rules: 60 s per statement, 5 s waiting for a lock).
// The pooler ignores settings sent at connect (PGOPTIONS), and a plain SET would stay on the pooled server connection
// for the next client, so the limits are set with SET LOCAL inside each transaction, where they end with it.
//
// withTimeouts(sql) returns the SQL with the limits in every transaction:
//  - after each BEGIN / START TRANSACTION already in the SQL, the SET LOCAL lines are added;
//  - SQL with no transaction of its own is wrapped in one: BEGIN; SET LOCAL ...; <sql>; COMMIT; (so a script's
//    statements now commit together; with ON_ERROR_STOP an error rolls all of them back);
//  - SQL that cannot run inside a transaction (CREATE/DROP INDEX CONCURRENTLY, VACUUM, CREATE DATABASE, ALTER SYSTEM,
//    REINDEX ... CONCURRENTLY) is returned unchanged; such work follows the migration rules instead.
// Use it on the text given to psql (-c, standard input, or the file's text instead of -f).
const TIMEOUTS = "SET LOCAL statement_timeout = '60s'; SET LOCAL lock_timeout = '5s';";
const NO_TX = /\b(CONCURRENTLY|VACUUM|CREATE\s+DATABASE|DROP\s+DATABASE|ALTER\s+SYSTEM)\b/i;
const BEGIN_RE = /^(\s*)(BEGIN|START\s+TRANSACTION)\b([^;]*);/gim;

function withTimeouts(sql) {
  const text = String(sql);
  if (NO_TX.test(text)) return text;
  if (/^\s*(BEGIN|START\s+TRANSACTION)\b/im.test(text)) return text.replace(BEGIN_RE, (m) => `${m}\n${TIMEOUTS}`);
  const body = text.trim().replace(/;\s*$/, '');
  return `BEGIN;\n${TIMEOUTS}\n${body};\nCOMMIT;\n`;
}

module.exports = { withTimeouts, TIMEOUTS };
