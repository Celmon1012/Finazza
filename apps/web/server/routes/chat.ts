import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { GROUP_MEMBER_LIMIT } from "../config.js";
import { requireAuth } from "../auth.js";
import { HttpError, wrap } from "../http.js";
import { Conversation, Message, ReadState, User, sameId } from "../models.js";
import { createNotification, getIO } from "../notify.js";
import { authorMini, messageDto } from "../present.js";
import { assertCleanText, canMessage, escapeRegex, extractMentions } from "../social.js";

const router = Router();
router.use(requireAuth);

const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You are sending messages too quickly." },
  keyGenerator: (req) => String(req.user?._id || req.ip),
});

function memberRole(convo: any, userId: unknown) {
  return convo.members.find((member: any) => sameId(member.user, userId))?.role || null;
}

async function loadConversation(id: string) {
  const convo = await Conversation.findById(id).populate("members.user", "username displayName avatarUrl messagePrivacy blockedUserIds");
  if (!convo) throw new HttpError(404, "Conversation not found");
  return convo;
}

function assertMember(convo: any, userId: unknown) {
  if (convo.type === "topic") return;
  if (!memberRole(convo, userId)) throw new HttpError(403, "You are not in this conversation");
}

async function unreadCount(convo: any, userId: unknown) {
  const state = await ReadState.findOne({ user: userId, conversation: convo._id });
  if (!state && convo.type === "topic") return 0;
  const since = state?.lastReadAt || new Date(0);
  return Message.countDocuments({
    conversation: convo._id,
    createdAt: { $gt: since },
    author: { $ne: userId },
    deleted: false,
  });
}

function conversationName(convo: any, viewerId: unknown) {
  if (convo.type !== "dm") return convo.name;
  const other = convo.members.find((member: any) => !sameId(member.user?._id || member.user, viewerId));
  return other?.user?.displayName || "Direct message";
}

async function presentConversation(convo: any, viewerId: unknown) {
  const members = (convo.members || []).map((member: any) => ({
    ...authorMini(member.user),
    role: member.role,
  }));
  return {
    id: String(convo._id),
    type: convo.type,
    name: conversationName(convo, viewerId),
    slug: convo.slug,
    description: convo.description || "",
    members,
    memberCount: convo.type === "topic" ? null : members.length,
    unreadCount: await unreadCount(convo, viewerId),
    lastMessageText: convo.lastMessageText || "",
    lastMessageAt: convo.lastMessageAt,
  };
}

router.get(
  "/",
  wrap(async (req, res) => {
    const scope = req.query.scope === "inbox" ? "inbox" : req.query.scope === "topic" ? "topic" : "all";
    const query =
      scope === "topic"
        ? { type: "topic" }
        : scope === "inbox"
          ? { type: { $in: ["dm", "group"] }, "members.user": req.user!._id }
          : { $or: [{ type: "topic" }, { "members.user": req.user!._id }] };
    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1, name: 1 })
      .populate("members.user", "username displayName avatarUrl");
    const items = await Promise.all(conversations.map((convo) => presentConversation(convo, req.user!._id)));
    if (scope === "topic") items.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ conversations: items });
  }),
);

router.post(
  "/",
  wrap(async (req, res) => {
    const body = z
      .object({
        type: z.enum(["dm", "group"]),
        username: z.string().trim().toLowerCase().optional(),
        name: z.string().trim().min(1).max(40).optional(),
        usernames: z.array(z.string().trim().toLowerCase()).max(GROUP_MEMBER_LIMIT - 1).optional(),
      })
      .parse(req.body);

    if (body.type === "dm") {
      if (!body.username) throw new HttpError(400, "Choose who you want to message");
      const other = await User.findOne({ username: body.username, suspended: false });
      if (!other) throw new HttpError(404, "User not found");
      await canMessage(req.user, other);
      const existing = await Conversation.findOne({
        type: "dm",
        $and: [{ "members.user": req.user!._id }, { "members.user": other._id }],
      });
      if (existing) {
        await existing.populate("members.user", "username displayName avatarUrl");
        res.json({ conversation: await presentConversation(existing, req.user!._id) });
        return;
      }
      const created = await Conversation.create({
        type: "dm",
        name: "",
        createdBy: req.user!._id,
        members: [
          { user: req.user!._id, role: "member" },
          { user: other._id, role: "member" },
        ],
      });
      await created.populate("members.user", "username displayName avatarUrl");
      res.status(201).json({ conversation: await presentConversation(created, req.user!._id) });
      return;
    }

    if (!body.name) throw new HttpError(400, "Name the group");
    const names = [...new Set(body.usernames || [])].filter((name) => name !== req.user!.username);
    const people = await User.find({ username: { $in: names }, suspended: false });
    if (people.length !== names.length) throw new HttpError(400, "One or more people could not be invited");
    for (const person of people) await canMessage(req.user, person);
    if (people.length + 1 > GROUP_MEMBER_LIMIT) throw new HttpError(400, `Groups are limited to ${GROUP_MEMBER_LIMIT} members`);

    const created = await Conversation.create({
      type: "group",
      name: body.name,
      createdBy: req.user!._id,
      members: [
        { user: req.user!._id, role: "admin" },
        ...people.map((person) => ({ user: person._id, role: "member" as const })),
      ],
    });
    await created.populate("members.user", "username displayName avatarUrl");
    res.status(201).json({ conversation: await presentConversation(created, req.user!._id) });
  }),
);

router.get(
  "/:id/messages",
  wrap(async (req, res) => {
    const convo = await loadConversation(req.params.id);
    assertMember(convo, req.user!._id);
    const limit = 50;
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const query: Record<string, unknown> = { conversation: convo._id };
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };
    const docs = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("author", "username displayName avatarUrl");
    const hasMore = docs.length > limit;
    const messages = docs.slice(0, limit).reverse().map(messageDto);
    res.json({ messages, hasMore });
  }),
);

router.post(
  "/:id/messages",
  messageLimiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        text: z.string().trim().max(1000).default(""),
        imageUrl: z.string().startsWith("/uploads/").nullable().optional(),
      })
      .parse(req.body);
    if (!body.text && !body.imageUrl) throw new HttpError(400, "Write a message or attach an image");
    if (body.text) assertCleanText(body.text);

    const convo = await loadConversation(req.params.id);
    assertMember(convo, req.user!._id);

    if (convo.type !== "topic") {
      for (const member of convo.members) {
        if (sameId(member.user?._id || member.user, req.user!._id)) continue;
        const person = member.user?._id ? member.user : await User.findById(member.user);
        if (person) await canMessage(req.user, person, "send");
      }
    }

    const message = await Message.create({
      conversation: convo._id,
      author: req.user!._id,
      text: body.text,
      imageUrl: body.imageUrl || null,
    });
    convo.lastMessageAt = message.createdAt;
    convo.lastMessageText = body.text || "Sent an image";
    await convo.save();
    await ReadState.findOneAndUpdate(
      { user: req.user!._id, conversation: convo._id },
      { lastReadAt: new Date() },
      { upsert: true },
    );

    await message.populate("author", "username displayName avatarUrl");
    const dto = messageDto(message);
    getIO()?.to(String(convo._id)).emit("message:new", dto);
    getIO()?.to(`user:${req.user!.id}`).emit("inbox:update", { conversationId: String(convo._id) });

    const mentioned = new Set(extractMentions(body.text));
    const mentionedUsers = mentioned.size ? await User.find({ username: { $in: [...mentioned] } }) : [];
    const mentionedIds = new Set(mentionedUsers.map((user) => String(user._id)));

    if (convo.type === "topic") {
      await Promise.all(
        mentionedUsers.map((user) =>
          createNotification({
            recipient: user._id,
            actor: req.user!._id,
            type: "mention",
            text: `${req.user!.displayName} mentioned you in #${convo.slug || convo.name}`,
            link: `/chat/${convo.id}`,
          }),
        ),
      );
    } else {
      await Promise.all(
        convo.members
          .filter((member: any) => !sameId(member.user?._id || member.user, req.user!._id))
          .map((member: any) => {
            const id = member.user?._id || member.user;
            const type = mentionedIds.has(String(id)) ? "mention" : "chat";
            const text =
              type === "mention"
                ? `${req.user!.displayName} mentioned you in ${conversationName(convo, id)}`
                : convo.type === "dm"
                  ? `${req.user!.displayName} sent you a message`
                  : `${req.user!.displayName} sent a message in ${convo.name}`;
            return createNotification({
              recipient: id,
              actor: req.user!._id,
              type,
              text,
              link: `/chat/${convo.id}`,
            });
          }),
      );
    }

    res.status(201).json({ message: dto });
  }),
);

router.post(
  "/:id/read",
  wrap(async (req, res) => {
    const convo = await loadConversation(req.params.id);
    assertMember(convo, req.user!._id);
    await ReadState.findOneAndUpdate(
      { user: req.user!._id, conversation: convo._id },
      { lastReadAt: new Date() },
      { upsert: true },
    );
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/members",
  wrap(async (req, res) => {
    const body = z.object({ username: z.string().trim().toLowerCase() }).parse(req.body);
    const convo = await loadConversation(req.params.id);
    if (convo.type !== "group") throw new HttpError(400, "Only group chats can be invited into");
    if (memberRole(convo, req.user!._id) !== "admin") throw new HttpError(403, "Only the group admin can add people");
    if (convo.members.length >= GROUP_MEMBER_LIMIT) throw new HttpError(400, `Groups are limited to ${GROUP_MEMBER_LIMIT} members`);
    const person = await User.findOne({ username: body.username, suspended: false });
    if (!person) throw new HttpError(404, "User not found");
    if (memberRole(convo, person._id)) throw new HttpError(409, "That person is already in the group");
    await canMessage(req.user, person);
    convo.members.push({ user: person._id, role: "member" });
    await convo.save();
    await convo.populate("members.user", "username displayName avatarUrl");
    res.json({ conversation: await presentConversation(convo, req.user!._id) });
  }),
);

router.delete(
  "/:id/members/:username",
  wrap(async (req, res) => {
    const convo = await loadConversation(req.params.id);
    if (convo.type !== "group") throw new HttpError(400, "Topic rooms and direct messages stay as they are");
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) throw new HttpError(404, "User not found");
    const isSelf = sameId(target._id, req.user!._id);
    if (!isSelf && memberRole(convo, req.user!._id) !== "admin") throw new HttpError(403, "Only the group admin can remove people");
    const remaining = convo.members
      .filter((member: any) => !sameId(member.user?._id || member.user, target._id))
      .map((member: any) => ({ user: member.user?._id || member.user, role: member.role }));
    if (!remaining.length) {
      await Message.deleteMany({ conversation: convo._id });
      await convo.deleteOne();
      res.json({ ok: true, deleted: true });
      return;
    }
    if (!remaining.some((member) => member.role === "admin")) remaining[0].role = "admin";
    await Conversation.updateOne({ _id: convo._id }, { $set: { members: remaining } });
    res.json({ ok: true, deleted: false });
  }),
);

router.get(
  "/suggest",
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (q.length < 1) {
      res.json({ users: [] });
      return;
    }
    const users = await User.find({
      _id: { $ne: req.user!._id },
      suspended: false,
      $or: [{ username: new RegExp(`^${escapeRegex(q)}`) }, { displayName: new RegExp(escapeRegex(q), "i") }],
    })
      .limit(8)
      .select("username displayName avatarUrl");
    res.json({ users: users.map(authorMini) });
  }),
);

export default router;
