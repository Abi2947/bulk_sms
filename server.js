const http = require("http");
const { validateAndDetectNetwork } = require("./validator");
const { enqueue } = require("./queue");

const PORT = 3000;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Method", "POST, OPTIONS");

  if (req.method === "OPTIONS") { 
    res.writeHead(204); 
    return res.end(); 
  }

  if (req.method === "POST" && req.url === "/send-sms") {
    let body;
    // ── Parse body 
    try {
      body = await parseBody(req);
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }

    const { number, message } = body;

    // ── Validate fields 
    const validationErrors = [];
    if (!number)  validationErrors.push("'number' is required");
    if (!message) validationErrors.push("'message' is required");
    if (typeof number  !== "undefined" && typeof number  !== "string") validationErrors.push("'number' must be a string");
    if (typeof message !== "undefined" && typeof message !== "string") validationErrors.push("'message' must be a string");
    if (message && message.trim().length === 0) validationErrors.push("'message' cannot be empty");

    if (validationErrors.length > 0) {
      return sendJSON(res, 400, { success: false, errors: validationErrors });
    }

    // ── Detect network from prefix 
    const networkResult = validateAndDetectNetwork(number.trim());
    if (!networkResult.valid) {
      return sendJSON(res, 422, { success: false, error: networkResult.error });
    }

    // ── Enqueue 
    const job = enqueue({ number: number.trim(), message: message.trim() });

    console.log(`[API] SMS queued → job #${job.id} | ${networkResult.network} | ${number}`);

    return sendJSON(res, 202, {
      success: true,
      message: "SMS queued successfully",
      job_id: job.id,
      number,
      detected_network: networkResult.network,
      queue_position: job.position,
    });
  }

  // ── 404 for everything else 
  sendJSON(res, 404, { success: false, error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] POST /send-sms  → queue an SMS`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down gracefully...");
  server.close(() => process.exit(0));
});
