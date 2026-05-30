/**
 * Entry point — starts both the HTTP server and the queue worker.
 *
 * Usage:
 *   SMS_API_KEY=xxx SMS_API_SECRET=yyy SMS_SENDER_ID=zzz node index.js
 *
 * Or copy .env.example → .env and use a tool like `dotenv-cli`:
 *   npx dotenv -- node index.js
 */

require("./worker"); // boots the worker (auto-starts on require)
require("./server"); // boots the HTTP server
