import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../auth.js";
import { HttpError, wrap } from "../http.js";
import { Conversation, Message, Notification, Post, Proof, Report, User, sameId } from "../models.js";
import { createNotification } from "../notify.js";
import { authorMini, notificationDto, postPopulate, presentPosts, savedPostIds } from "../present.js";
import { escapeRegex } from "../social.js";
import { saveUpload } from "../storage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 4 },
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  message: { error: "Too many uploads. Try again shortly." },
  keyGenerator: (req) => String(req.user?._id || req.ip),
});

router.post(
  "/uploads",
  requireAuth,
  uploadLimiter,
  upload.array("files", 4),
  wrap(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new HttpError(400, "Choose an image");
    const saved = [];
    for (const file of files) {
      const image = await saveUpload(file.buffer, file.mimetype, false);
      saved.push({ url: image.url, kind: "image" as const });
    }
    res.status(201).json({ files: saved });
  }),
);

router.get(
  "/badges",
  requireAuth,
  wrap(async (req, res) => {
    const [notifications, conversations] = await Promise.all([
      Notification.countDocuments({ recipient: req.user!._id, read: false }),
      Conversation.find({ type: { $in: ["dm", "group"] }, "members.user": req.user!._id }).select("_id"),
    ]);
    const { ReadState, Message } = await import("../models.js");
    let messages = 0;
    for (const convo of conversations) {
      const state = await ReadState.findOne({ user: req.user!._id, conversation: convo._id });
      const since = state?.lastReadAt || new Date(0);
      messages += await Message.countDocuments({
        conversation: convo._id,
        createdAt: { $gt: since },
        author: { $ne: req.user!._id },
        deleted: false,
      });
    }
    res.json({ notifications, messages });
  }),
);

router.get(
  "/notifications",
  requireAuth,
  wrap(async (req, res) => {
    const notes = await Notification.find({ recipient: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actor", "username displayName avatarUrl");
    res.json({ notifications: notes.map(notificationDto) });
  }),
);

router.post(
  "/notifications/read-all",
  requireAuth,
  wrap(async (req, res) => {
    await Notification.updateMany({ recipient: req.user!._id, read: false }, { read: true });
    res.json({ ok: true });
  }),
);

router.post(
  "/notifications/:id/read",
  requireAuth,
  wrap(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, recipient: req.user!._id }, { read: true });
    res.json({ ok: true });
  }),
);

router.get(
  "/search",
  requireAuth,
  wrap(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      res.json({ users: [], posts: [] });
      return;
    }
    const pattern = new RegExp(escapeRegex(q), "i");
    const [users, posts] = await Promise.all([
      User.find({ suspended: false, $or: [{ username: pattern }, { displayName: pattern }] })
        .limit(8)
        .select("username displayName avatarUrl bio"),
      Post.find({ deletedAt: null, text: pattern }).sort({ createdAt: -1 }).limit(8).populate(postPopulate),
    ]);
    res.json({
      users: users.map(authorMini),
      posts: await presentPosts(posts, String(req.user!._id), savedPostIds(req.user)),
    });
  }),
);

router.post(
  "/reports",
  requireAuth,
  wrap(async (req, res) => {
    const body = z
      .object({
        targetType: z.enum(["post", "message", "proof", "user"]),
        targetId: z.string().min(1),
        reason: z.enum(["spam", "misleading", "harassment", "other"]),
        details: z.string().trim().max(500).optional(),
      })
      .parse(req.body);

    if (body.targetType === "user" && sameId(body.targetId, req.user!._id)) {
      throw new HttpError(400, "You cannot report yourself");
    }
    const report = await Report.create({
      reporter: req.user!._id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details || "",
    });
    res.status(201).json({ report: { id: String(report._id), status: report.status } });
  }),
);

router.get(
  "/admin/reports",
  requireAuth,
  requireAdmin,
  wrap(async (_req, res) => {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100).populate("reporter", "username displayName avatarUrl");
    res.json({
      reports: reports.map((report) => ({
        id: String(report._id),
        targetType: report.targetType,
        targetId: String(report.targetId),
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
        reporter: authorMini(report.reporter),
      })),
    });
  }),
);

router.post(
  "/admin/reports/:id",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const body = z.object({ action: z.enum(["dismiss", "hide", "suspend"]) }).parse(req.body);
    const report = await Report.findById(req.params.id);
    if (!report) throw new HttpError(404, "Report not found");

    if (body.action === "dismiss") {
      report.status = "dismissed";
      await report.save();
      res.json({ ok: true });
      return;
    }

    if (body.action === "hide" || body.action === "suspend") {
      let ownerId: unknown = null;
      if (report.targetType === "post") {
        const post = await Post.findById(report.targetId);
        if (post) {
          ownerId = post.author;
          post.deletedAt = new Date();
          await post.save();
        }
      } else if (report.targetType === "message") {
        const message = await Message.findById(report.targetId);
        if (message) {
          ownerId = message.author;
          message.deleted = true;
          message.text = "";
          message.imageUrl = null;
          await message.save();
        }
      } else if (report.targetType === "proof") {
        const proof = await Proof.findById(report.targetId);
        if (proof) {
          ownerId = proof.uploader;
          const { deletePublicFile } = await import("../storage.js");
          await deletePublicFile(proof.url);
          await proof.deleteOne();
        }
      } else if (report.targetType === "user") {
        ownerId = report.targetId;
      }

      if (body.action === "suspend" && ownerId && !sameId(ownerId, req.user!._id)) {
        await User.updateOne({ _id: ownerId, role: { $ne: "admin" } }, { suspended: true });
      }

      if (ownerId) {
        await createNotification({
          recipient: ownerId,
          actor: req.user!._id,
          type: "moderation",
          text:
            body.action === "suspend"
              ? "A moderator suspended an account linked to a report"
              : "A moderator removed content you posted",
          link: "/notifications",
        });
      }
      report.status = "resolved";
      await report.save();
    }
    res.json({ ok: true });
  }),
);

router.delete(
  "/admin/messages/:id",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const message = await Message.findById(req.params.id);
    if (!message) throw new HttpError(404, "Message not found");
    message.deleted = true;
    message.text = "";
    message.imageUrl = null;
    await message.save();
    await createNotification({
      recipient: message.author,
      actor: req.user!._id,
      type: "moderation",
      text: "A moderator removed one of your messages",
      link: `/chat/${message.conversation}`,
    });
    res.json({ ok: true });
  }),
);

router.post(
  "/admin/rooms",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(40),
        slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "Use a short hyphenated slug"),
        description: z.string().trim().max(200).optional(),
      })
      .parse(req.body);
    const existing = await Conversation.findOne({ slug: body.slug });
    if (existing) throw new HttpError(409, "A room with that slug already exists");
    const room = await Conversation.create({
      type: "topic",
      name: body.name,
      slug: body.slug,
      description: body.description || "",
      createdBy: req.user!._id,
      members: [],
    });
    res.status(201).json({ room: { id: String(room._id), name: room.name, slug: room.slug } });
  }),
);

router.post(
  "/admin/users/:id/suspend",
  requireAuth,
  requireAdmin,
  wrap(async (req, res) => {
    const body = z.object({ suspended: z.boolean() }).parse(req.body);
    if (sameId(req.params.id, req.user!._id)) throw new HttpError(400, "You cannot suspend yourself");
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, "User not found");
    if (user.role === "admin") throw new HttpError(403, "Admin accounts stay active");
    user.suspended = body.suspended;
    await user.save();
    res.json({ ok: true, suspended: user.suspended });
  }),
);

export default router;
