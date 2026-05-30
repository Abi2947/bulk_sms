# SMS Queue System

Zero-dependency SMS queue built on raw Node.js core modules.

## Files

```
sms-queue/
├── index.js       ← entry point (boots server + worker)
├── server.js      ← HTTP server, POST /send-sms route
├── queue.js       ← in-memory FIFO queue
├── worker.js      ← queue processor with retry logic
├── sender.js      ← SMS provider API call (plug your creds here)
├── validator.js   ← phone number validation + network detection
└── .env.example   ← credential template
```

## Setup

1. **Add your SMS provider credentials** in `sender.js` (or via env vars):

```bash
cp .env.example .env
# edit .env with your real API key, secret, sender ID
```

2. **Run the server:**

```bash
# with env vars inline
SMS_API_KEY=xxx SMS_SENDER_ID=YourApp node index.js

# or with dotenv-cli
npx dotenv -- node index.js
```

## API

### POST /send-sms

**Request body (JSON):**
```json
{
  "number":  "9841234567",
  "message": "Hello from the queue!"
}
```

**Success response (202):**
```json
{
  "success": true,
  "message": "SMS queued successfully",
  "job_id": 1,
  "number": "9841234567",
  "detected_network": "NTC",
  "queue_position": 1
}
```

**Validation error (400/422):**
```json
{
  "success": false,
  "error": "Unable to detect network for number \"099999\". Unrecognised prefix."
}
```

## How it works

```
POST /send-sms
     │
     ▼
 Validate fields
     │
     ▼
 Detect network from prefix
     │
     ▼
 Push job into in-memory queue ──→ return 202 immediately
                                         │
                              Worker picks up job
                                         │
                              ┌──────────▼──────────┐
                              │   Call SMS provider │
                              └──────────┬──────────┘
                                      success → markDone
                                      fail    → retry (up to 3×)
                                              → back-off: 2s / 5s / 10s
                                              → markFailed after 3 attempts
```

## Retry behaviour

| Attempt | Delay before retry |
|---------|--------------------|
| 1 → 2   | 2 seconds          |
| 2 → 3   | 5 seconds          |
| 3 (last)| — permanently fail |

All failures are logged with timestamps and job IDs.

## Plugging in a different SMS provider

Edit `sender.js`:
1. Update `SMS_CONFIG.host` and `SMS_CONFIG.path`
2. Update the `requestBody` shape to match your provider's API
3. Update the `responseOk` check to match your provider's success response

The worker, queue, and server need no changes.

## Extending network detection

Edit `validator.js` → `PREFIX_MAP` to add prefixes for other countries or networks. Prefixes are matched longest-first.
