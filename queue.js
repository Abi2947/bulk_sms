/**
 * Simple in-memory FIFO queue.
 *
 * Jobs flow through these states:
 *   pending → processing → done
 *                       ↘ failed  (after MAX_RETRIES exhausted)
 */

const EventEmitter = require("events");

const queue = [];          // pending jobs
let   jobCounter = 0;      // monotonic ID
const emitter = new EventEmitter();

/**
 * Add a job to the back of the queue.
 * Returns the job object so the caller can read id / position.
 */
function enqueue(payload) {
  const job = {
    id:        ++jobCounter,
    payload,                  // { number, message }
    status:    "pending",
    retries:   0,
    createdAt: new Date().toISOString(),
  };

  queue.push(job);
  emitter.emit("enqueued", job);

  return { id: job.id, position: queue.length };
}

/**
 * Pull the next pending job (mutates status to "processing").
 * Returns null when the queue is empty.
 */
function dequeue() {
  const index = queue.findIndex((j) => j.status === "pending");
  if (index === -1) return null;

  queue[index].status = "processing";
  return queue[index];
}

/** Mark a job done and remove it from the live queue. */
function markDone(job) {
  job.status = "done";
  const index = queue.indexOf(job);
  if (index !== -1) queue.splice(index, 1);
}

/** Put a failed-but-retriable job back to pending. */
function requeue(job) {
  job.status = "pending";
}

/** Permanently fail a job and remove it from the live queue. */
function markFailed(job) {
  job.status = "failed";
  const index = queue.indexOf(job);
  if (index !== -1) queue.splice(index, 1);
}

/** Snapshot of the current queue (for debugging / health endpoints). */
function snapshot() {
  return queue.map((j) => ({ ...j }));
}

module.exports = { enqueue, dequeue, requeue, markDone, markFailed, snapshot, emitter };
