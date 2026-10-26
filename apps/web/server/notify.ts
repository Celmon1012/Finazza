import type { Server } from "socket.io";
import { Notification, User, sameId } from "./models.js";
import { notificationDto } from "./present.js";

let io: Server | null = null;

export function setIO(server: Server) {
  io = server;
}

export function getIO() {
  return io;
}

const settingKey = {
  like: "likes",
  reply: "replies",
  repost: "reposts",
  follow: "follows",
  mention: "mentions",
  chat: "chat",
  moderation: "moderation",
} as const;

export async function createNotification(input: {
  recipient: unknown;
  actor?: unknown | null;
  type: keyof typeof settingKey;
  text: string;
  link: string;
}) {
  if (!input.recipient) return null;
  if (input.actor && sameId(input.recipient, input.actor)) return null;

  const recipient = await User.findById(input.recipient);
  if (!recipient || recipient.suspended) return null;

  if (input.actor) {
    const actor = await User.findById(input.actor);
    if (!actor) return null;
    const blocked =
      recipient.blockedUserIds.some((id) => sameId(id, actor._id)) ||
      actor.blockedUserIds.some((id) => sameId(id, recipient._id));
    const muted = recipient.mutedUserIds.some((id) => sameId(id, actor._id));
    if (blocked || muted) return null;
  }

  const key = settingKey[input.type];
  if (recipient.notificationSettings?.[key] === false) return null;

  const note = await Notification.create({
    recipient: recipient._id,
    actor: input.actor || null,
    type: input.type,
    text: input.text.slice(0, 180),
    link: input.link,
  });
  await note.populate("actor", "username displayName avatarUrl");
  getIO()?.to(`user:${recipient.id}`).emit("notification:new", notificationDto(note));
  return note;
}
