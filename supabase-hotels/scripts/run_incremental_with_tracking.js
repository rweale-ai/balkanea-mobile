// Wrapper around import_hotels_incremental.js that adds automatic
// performance tracking, for unattended/scheduled runs (e.g. Windows Task
// Scheduler) where nobody is watching the terminal to log checkpoints by
// hand the way the full-dump import was tracked interactively on
// 2026-09-05/06 (see project_balkanea_hotels_poc_database memory).
//
// Writes two files per run into logs/ (gitignored, contains no secrets --
// just timestamps and row counts):
//   incremental-YYYY-MM-DDTHH-mm-ss.log  -- raw timestamped stdout/stderr
//   incremental-performance.csv          -- one row per checkpoint, appended
//                                            across runs so trends are
//                                            visible day over day, not just
//                                            within a single run.

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const LOG_DIR = path.join(__dirname, '..', 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const rawLogPath = path.join(LOG_DIR, `incremental-${runStamp}.log`);
const csvPath = path.join(LOG_DIR, 'incremental-performance.csv');

if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, 'run_id,timestamp,elapsed_s,scanned,upserted,soft_deleted,errors,segment_rows,segment_seconds,segment_rows_per_sec,note\n');
}

const rawLogFd = fs.openSync(rawLogPath, 'a');
function logRaw(line) {
  fs.writeSync(rawLogFd, `[${new Date().toISOString()}] ${line}\n`);
}

function appendCsvRow(fields) {
  fs.appendFileSync(csvPath, fields.join(',') + '\n');
}

const CHECKPOINT_RE = /scanned ([\d,]+) \| upserted ([\d,]+) \| soft-deleted ([\d,]+) \| errors (\d+) \| (\d+)s elapsed/;
const DONE_RE = /^Done in (\d+)s/;

let lastScanned = 0;
let lastElapsed = 0;
let finalSummary = { scanned: null, upserted: null, softDeleted: null, errors: null, doneElapsed: null };

function handleLine(line) {
  logRaw(line);

  const cp = line.match(CHECKPOINT_RE);
  if (cp) {
    const scanned = parseInt(cp[1].replace(/,/g, ''), 10);
    const upserted = parseInt(cp[2].replace(/,/g, ''), 10);
    const softDeleted = parseInt(cp[3].replace(/,/g, ''), 10);
    const errors = parseInt(cp[4], 10);
    const elapsed = parseInt(cp[5], 10);

    const segRows = scanned - lastScanned;
    const segSecs = elapsed - lastElapsed;
    const rate = segSecs > 0 ? (segRows / segSecs).toFixed(1) : '';

    appendCsvRow([runStamp, new Date().toISOString(), elapsed, scanned, upserted, softDeleted, errors, segRows, segSecs, rate, 'checkpoint']);
    lastScanned = scanned;
    lastElapsed = elapsed;
    return;
  }

  const done = line.match(DONE_RE);
  if (done) {
    finalSummary.doneElapsed = parseInt(done[1], 10);
  }
  const scannedFinal = line.match(/^Lines scanned: ([\d,]+)/);
  if (scannedFinal) finalSummary.scanned = parseInt(scannedFinal[1].replace(/,/g, ''), 10);
  const upsertedFinal = line.match(/^Hotels upserted: ([\d,]+)/);
  if (upsertedFinal) finalSummary.upserted = parseInt(upsertedFinal[1].replace(/,/g, ''), 10);
  const deletedFinal = line.match(/^Hotels soft-deleted: ([\d,]+)/);
  if (deletedFinal) finalSummary.softDeleted = parseInt(deletedFinal[1].replace(/,/g, ''), 10);
  const errorsFinal = line.match(/^Parse errors: (\d+)/);
  if (errorsFinal) finalSummary.errors = parseInt(errorsFinal[1], 10);
}

const child = spawn(process.execPath, [path.join(__dirname, 'import_hotels_incremental.js'), 'en'], {
  cwd: path.join(__dirname, '..'),
});

let stdoutBuf = '';
child.stdout.on('data', (chunk) => {
  stdoutBuf += chunk.toString();
  let idx;
  while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
    handleLine(stdoutBuf.slice(0, idx));
    stdoutBuf = stdoutBuf.slice(idx + 1);
  }
});
let stderrBuf = '';
child.stderr.on('data', (chunk) => {
  stderrBuf += chunk.toString();
  let idx;
  while ((idx = stderrBuf.indexOf('\n')) >= 0) {
    logRaw('STDERR: ' + stderrBuf.slice(0, idx));
    stderrBuf = stderrBuf.slice(idx + 1);
  }
});

child.on('close', (code) => {
  if (stdoutBuf) handleLine(stdoutBuf);
  if (stderrBuf) logRaw('STDERR: ' + stderrBuf);

  const overallRate = finalSummary.doneElapsed && finalSummary.scanned
    ? (finalSummary.scanned / finalSummary.doneElapsed).toFixed(1)
    : '';
  appendCsvRow([
    runStamp, new Date().toISOString(), finalSummary.doneElapsed ?? '',
    finalSummary.scanned ?? '', finalSummary.upserted ?? '', finalSummary.softDeleted ?? '',
    finalSummary.errors ?? '', '', '', overallRate,
    code === 0 ? 'FINAL' : `FAILED exit_code=${code}`,
  ]);
  logRaw(`Wrapper exiting, child exit code ${code}`);
  fs.closeSync(rawLogFd);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  logRaw('SPAWN ERROR: ' + err.message);
  appendCsvRow([runStamp, new Date().toISOString(), '', '', '', '', '', '', '', '', `SPAWN_ERROR: ${err.message}`]);
  fs.closeSync(rawLogFd);
  process.exit(1);
});
