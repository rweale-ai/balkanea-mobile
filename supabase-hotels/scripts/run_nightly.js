// Nightly refresh of balkanea_hotels_poc_v2 from RateHawk production:
//   1. hotel delta  -- run_incremental_with_tracking.js (skips itself if
//      RateHawk hasn't published a new incremental file since the last run)
//   2. ratings      -- import_hotel_ratings.js, all languages
// Step 2 runs even if step 1 fails; they're independent.
//
// Scheduled on Ray's PC via Windows Task Scheduler ("Balkanea POC nightly
// refresh", 03:00 Skopje) for a few days of timing measurements, agreed on
// the 2026-10-08 status call; the permanent job is Hristijan's to build.
//
// Writes into logs/ (gitignored, no secrets):
//   nightly-<stamp>.log   -- combined timestamped output of both steps
//   nightly-summary.csv   -- one row per step per run, appended across runs

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const logPath = path.join(LOG_DIR, `nightly-${runStamp}.log`);
const csvPath = path.join(LOG_DIR, 'nightly-summary.csv');
if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, 'run_id,step,started_at,finished_at,seconds,exit_code,note\n');
}

const logFd = fs.openSync(logPath, 'a');
function log(line) {
  fs.writeSync(logFd, `[${new Date().toISOString()}] ${line}\n`);
}

function runStep(name, script, args) {
  return new Promise((resolve) => {
    const started = new Date();
    let note = '';
    log(`=== ${name}: starting ===`);
    const child = spawn(process.execPath, [path.join(__dirname, script), ...args], { cwd: ROOT });

    for (const [stream, prefix] of [[child.stdout, ''], [child.stderr, 'STDERR: ']]) {
      let buf = '';
      stream.on('data', (chunk) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).replace(/\r$/, '');
          buf = buf.slice(idx + 1);
          log(prefix + line);
          if (/SKIPPED_ALREADY_APPLIED|SKIPPED:/.test(line)) note = 'skipped: incremental file already applied';
        }
      });
      stream.on('end', () => { if (buf) log(prefix + buf); });
    }

    const finish = (code, err) => {
      const finished = new Date();
      const seconds = Math.round((finished - started) / 1000);
      if (err) note = `spawn error: ${err.message}`;
      log(`=== ${name}: exit ${code} after ${seconds}s ===`);
      fs.appendFileSync(csvPath, [runStamp, name, started.toISOString(), finished.toISOString(), seconds, code, note].join(',') + '\n');
      resolve(code);
    };
    child.on('error', (err) => finish(-1, err));
    child.on('close', (code) => finish(code ?? -1));
  });
}

(async () => {
  log(`Nightly refresh run ${runStamp}`);
  const deltaCode = await runStep('hotel_delta', 'run_incremental_with_tracking.js', []);
  const ratingsCode = await runStep('ratings', 'import_hotel_ratings.js', []);
  log(`Done. hotel_delta exit ${deltaCode}, ratings exit ${ratingsCode}`);
  fs.closeSync(logFd);
  process.exit(deltaCode === 0 && ratingsCode === 0 ? 0 : 1);
})();
