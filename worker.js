const { dequeue, requeue, markDone, markFailed, emitter } = require("./queue");
const { sendSMS } = require("./sender");

// ── Configuration 
const MAX_RETRIES       = 3;          // max send attempts per job
const RETRY_DELAYS_MS   = [2_000, 5_000, 10_000]; // back-off between retries
const POLL_INTERVAL_MS  = 1_000;      // idle poll when queue is empty

// ── State 
let workerBusy   = false;
let pollTimer    = null;

// ── Logger helper 
function log(level, jobId, msg) {
  const ts = new Date().toISOString();
  const prefix = `[Worker][${ts}][job #${jobId}]`;
  if (level === "error") {
    console.error(`${prefix}  ${msg}`);
  } else if (level === "warn") {
    console.warn(`${prefix}   ${msg}`);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

// ── Sleep helper 
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Core: process one job
async function processJob(job) {
  const { number, message } = job.payload;

  log("info", job.id, `Processing → ${number} | attempt ${job.retries + 1}/${MAX_RETRIES}`);

  try {
    const result = await sendSMS({ number, message });
    markDone(job);
    log("info", job.id, `Sent successfully → HTTP ${result.statusCode}`);
  } catch (err) {
    job.retries += 1;

    if (job.retries < MAX_RETRIES) {
      const delay = RETRY_DELAYS_MS[job.retries - 1] ?? 10_000;
      log("warn", job.id,
        `Send failed (attempt ${job.retries}/${MAX_RETRIES}) — retrying in ${delay / 1000}s. Reason: ${err.message}`
      );
      requeue(job);          // put back as pending
      await sleep(delay);    // back-off before the worker picks it up again
    } else {
      markFailed(job);
      log("error", job.id,
        `Permanently failed after ${MAX_RETRIES} attempts. Last error: ${err.message}`
      );
    }
  }
}

// ── Main worker loop 
async function tick() {
  if (workerBusy) return;

  const job = dequeue();

  if (!job) {
    // Nothing to do — idle poll will call tick() again shortly
    return;
  }

  workerBusy = true;
  try {
    await processJob(job);
  } finally {
    workerBusy = false;
    // Immediately try next job without waiting for the poll interval
    setImmediate(tick);
  }
}

// ── Start the worker 
function startWorker() {
  console.log("[Worker] Started — polling every", POLL_INTERVAL_MS, "ms");

  // Poll on a fixed interval (catches jobs added while worker was idle)
  pollTimer = setInterval(tick, POLL_INTERVAL_MS);

  // Also react immediately when a new job is enqueued
  emitter.on("enqueued", () => setImmediate(tick));
}

function stopWorker() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[Worker] Stopped");
  }
}

// Auto-start when this module is required
startWorker();

module.exports = { startWorker, stopWorker };
