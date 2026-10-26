import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { setIO } from "./notify.js";
import { seedIfEmpty } from "./seed.js";
import { registerSocket } from "./socket.js";
import { ensureUploadDir } from "./storage.js";

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigin, credentials: true },
});

setIO(io);
registerSocket(io);

async function main() {
  await ensureUploadDir();
  await connectDb();
  await seedIfEmpty();
  server.listen(config.port, () => {
    console.log(`FINAZZA API listening on ${config.apiPublicUrl}`);
  });
}

async function shutdown() {
  server.close();
  await disconnectDb();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
