import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { config } from "./config.js";
import { Conversation, User } from "./models.js";

export function registerSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Missing token");
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
      const user = await User.findById(payload.sub);
      if (!user || user.suspended) throw new Error("Unauthorized");
      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.data.userId);
    socket.join(`user:${userId}`);

    socket.on("conversation:join", async (conversationId: string) => {
      if (!conversationId) return;
      const convo = await Conversation.findById(conversationId).select("type members");
      if (!convo) return;
      const allowed = convo.type === "topic" || convo.members.some((member) => String(member.user) === userId);
      if (!allowed) return;
      socket.join(String(convo._id));
    });

    socket.on("conversation:leave", (conversationId: string) => {
      if (conversationId) socket.leave(conversationId);
    });
  });
}
