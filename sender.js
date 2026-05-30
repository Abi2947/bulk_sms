const https = require("https");

// ── NestSMS credentials 
const SMS_CONFIG = {
  apiKey:   process.env.SMS_API_KEY || "nsms_live_075dd8ec0b10c5fefa79a07870ab4d055b1ef086b0b96a6e07d2140636555fa0",
  hostname: "auth.dev.nestsms.com",
  path:     "/api/v1/sms/send",
};

/**
 * sendSMS({ number, message })
 * Calls the NestSMS API. Resolves on success, rejects on failure.
 */
function sendSMS({ number, message }) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      to:      number,
      message: message,
    });

    const options = {
      hostname: SMS_CONFIG.hostname,
      path:     SMS_CONFIG.path,
      method:   "POST",
      headers: {
        "X-API-Key":      SMS_CONFIG.apiKey,
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        // Try to parse JSON — fall back to raw text for logging
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { raw: data };
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: parsed });
        } else {
          reject(
            new Error(
              `NestSMS error (HTTP ${res.statusCode}): ${JSON.stringify(parsed)}`
            )
          );
        }
      });
    });

    req.on("error", (err) =>
      reject(new Error(`Network error reaching NestSMS: ${err.message}`))
    );

    req.setTimeout(15_000, () => {
      req.destroy();
      reject(new Error("NestSMS request timed out after 15 s"));
    });

    req.write(requestBody);
    req.end();
  });
}

module.exports = { sendSMS };