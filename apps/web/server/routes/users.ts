import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { HttpError, wrap } from "../http.js";
import { Follow, User, sameId } from "../models.js";
import { createNotification } from "../notify.js";
import { authorMini, postPopulate, presentPosts, profileDto } from "../present.js";
import { Post } from "../models.js";
import { deletePublicFile, saveUpload } from "../storage.js";

const router = Router();

router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.patch(
  "/me",
  wrap(async (req, res) => {
    const body = z
      .object({
        displayName: z.string().trim().min(1).max(40).optional(),
        bio: z.string().trim().max(160).optional(),
        location: z.string().trim().max(40).optional(),
        website: z.string().trim().max(160).optional(),
        avatarUrl: z.string().nullable().optional(),
        messagePrivacy: z.enum(["everyone", "followers"]).optional(),
        notificationSettings: z
          .object({
            likes: z.boolean().optional(),
            replies: z.boolean().optional(),
            reposts: z.boolean().optional(),
            follows: z.boolean().optional(),
            mentions: z.boolean().optional(),
            chat: z.boolean().optional(),
            moderation: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(req.body);

    if (body.website && !/^https?:\/\/.+/i.test(body.website)) {
      throw new HttpError(400, "Website must start with http:// or https://");
    }
    const user = req.user!;
    if (body.displayName != null) user.displayName = body.displayName;
    if (body.bio != null) user.bio = body.bio;
    if (body.location != null) user.location = body.location;
    if (body.website != null) user.website = body.website;
    if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl;
    if (body.messagePrivacy) user.messagePrivacy = body.messagePrivacy;
    if (body.notificationSettings) {
      user.notificationSettings = { ...user.notificationSettings, ...body.notificationSettings };
      user.markModified("notificationSettings");
    }
    await user.save();
    const { meDto } = await import("../present.js");
    res.json({ user: meDto(user) });
  }),
);

router.post(
  "/me/avatar",
  upload.single("file"),
  wrap(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a photo");
    let saved;
    try {
      saved = await saveUpload(req.file.buffer, req.file.mimetype || "", false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload the photo";
      throw new HttpError(400, message.slice(0, 200));
    }
    const previous = req.user!.avatarUrl;
    req.user!.avatarUrl = saved.url;
    await req.user!.save();
    if (previous && previous !== saved.url) await deletePublicFile(previous);
    const { meDto } = await import("../present.js");
    res.json({ user: meDto(req.user) });
  }),
);

router.post(
  "/me/password",
  wrap(async (req, res) => {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
      .parse(req.body);
    const user = await User.findById(req.user!._id).select("+passwordHash");
    if (!user) throw new HttpError(401, "Sign in required");
    const match = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!match) throw new HttpError(400, "Current password is incorrect");
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    await user.save();
    res.json({ ok: true });
  }),
);

router.get(
  "/me/relations",
  wrap(async (req, res) => {
    const user = await User.findById(req.user!._id)
      .populate("blockedUserIds", "username displayName avatarUrl")
      .populate("mutedUserIds", "username displayName avatarUrl");
    res.json({
      blocked: (user?.blockedUserIds || []).map((person: any) => authorMini(person)),
      muted: (user?.mutedUserIds || []).map((person: any) => authorMini(person)),
    });
  }),
);

router.get(
  "/:username",
  wrap(async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user || user.suspended) throw new HttpError(404, "Profile unavailable");
    if (user.blockedUserIds.some((id) => sameId(id, req.user!._id)) && !sameId(user._id, req.user!._id)) {
      throw new HttpError(404, "Profile unavailable");
    }
    const profile = await profileDto(user, String(req.user!._id));
    const viewerBlocked = req.user!.blockedUserIds.some((id: unknown) => sameId(id, user._id));
    const viewerMuted = req.user!.mutedUserIds.some((id: unknown) => sameId(id, user._id));
    res.json({ profile: { ...profile, youBlocked: viewerBlocked, youMuted: viewerMuted } });
  }),
);

router.get(
  "/:username/posts",
  wrap(async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user || user.suspended) throw new HttpError(404, "Profile unavailable");
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 20;
    const docs = await Post.find({ author: user._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .populate(postPopulate);
    const hasMore = docs.length > limit;
    res.json({ posts: await presentPosts(docs.slice(0, limit), String(req.user!._id)), page, hasMore });
  }),
);

router.post(
  "/:username/follow",
  wrap(async (req, res) => {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target || target.suspended) throw new HttpError(404, "Profile unavailable");
    if (sameId(target._id, req.user!._id)) throw new HttpError(400, "You cannot follow yourself");
    if (target.blockedUserIds.some((id: unknown) => sameId(id, req.user!._id))) throw new HttpError(403, "You cannot follow this account");
    if (req.user!.blockedUserIds.some((id: unknown) => sameId(id, target._id))) throw new HttpError(403, "Unblock this account before following");

    const existing = await Follow.findOne({ follower: req.user!._id, following: target._id });
    if (existing) {
      await existing.deleteOne();
      res.json({ following: false });
      return;
    }
    await Follow.create({ follower: req.user!._id, following: target._id });
    await createNotification({
      recipient: target._id,
      actor: req.user!._id,
      type: "follow",
      text: `${req.user!.displayName} followed you`,
      link: `/u/${req.user!.username}`,
    });
    res.json({ following: true });
  }),
);

router.post(
  "/:username/block",
  wrap(async (req, res) => {
    const body = z.object({ blocked: z.boolean() }).parse(req.body);
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) throw new HttpError(404, "Profile unavailable");
    if (sameId(target._id, req.user!._id)) throw new HttpError(400, "You cannot block yourself");
    const user = req.user!;
    user.blockedUserIds = user.blockedUserIds.filter((id: unknown) => !sameId(id, target._id));
    if (body.blocked) {
      user.blockedUserIds.push(target._id);
      await Follow.deleteMany({
        $or: [
          { follower: user._id, following: target._id },
          { follower: target._id, following: user._id },
        ],
      });
    }
    await user.save();
    res.json({ blocked: body.blocked });
  }),
);

router.post(
  "/:username/mute",
  wrap(async (req, res) => {
    const body = z.object({ muted: z.boolean() }).parse(req.body);
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) throw new HttpError(404, "Profile unavailable");
    if (sameId(target._id, req.user!._id)) throw new HttpError(400, "You cannot mute yourself");
    const user = req.user!;
    user.mutedUserIds = user.mutedUserIds.filter((id: unknown) => !sameId(id, target._id));
    if (body.muted) user.mutedUserIds.push(target._id);
    await user.save();
    res.json({ muted: body.muted });
  }),
);

export default router;
