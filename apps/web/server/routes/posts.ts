import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { HttpError, wrap } from "../http.js";
import { Follow, Like, Post, Repost, User, sameId } from "../models.js";
import { createNotification } from "../notify.js";
import { authorMini, postPopulate, presentPosts } from "../present.js";
import { assertCleanText, excludedAuthorIds, extractMentions } from "../social.js";
import { isStoredFileUrl } from "../storage.js";

const router = Router();
router.use(requireAuth);

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You are posting too quickly. Try again shortly." },
  keyGenerator: (req) => String(req.user?._id || req.ip),
});

const attachmentSchema = z.object({
  url: z.string().refine(isStoredFileUrl, "That image is not one of your uploads"),
  kind: z.literal("image").default("image"),
});

async function notifyMentions(text: string, actor: any, link: string, exceptIds: string[]) {
  const names = extractMentions(text);
  if (!names.length) return;
  const users = await User.find({ username: { $in: names }, suspended: false });
  await Promise.all(
    users
      .filter((user) => !exceptIds.includes(String(user._id)))
      .map((user) =>
        createNotification({
          recipient: user._id,
          actor: actor._id,
          type: "mention",
          text: `${actor.displayName} mentioned you`,
          link,
        }),
      ),
  );
}

router.get(
  "/feed",
  wrap(async (req, res) => {
    const tab = req.query.tab === "explore" ? "explore" : "following";
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 20;
    const exclude = await excludedAuthorIds(req.user!);
    const query: Record<string, unknown> = { deletedAt: null, author: { $nin: exclude } };

    if (tab === "following") {
      const following = await Follow.find({ follower: req.user!._id }).distinct("following");
      const ids = [req.user!._id, ...following].filter((id) => !exclude.includes(String(id)));
      query.author = { $in: ids };
    }

    const docs = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1)
      .populate(postPopulate);
    const hasMore = docs.length > limit;
    res.json({ posts: await presentPosts(docs.slice(0, limit), String(req.user!._id)), page, hasMore });
  }),
);

router.post(
  "/",
  writeLimiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        text: z.string().trim().max(500).default(""),
        attachments: z.array(attachmentSchema).max(4).default([]),
        replyTo: z.string().nullable().optional(),
        repostOf: z.string().nullable().optional(),
      })
      .parse(req.body);

    if (!body.text && body.attachments.length === 0 && !body.repostOf) {
      throw new HttpError(400, "Write something or attach an image");
    }
    if (body.text) assertCleanText(body.text);

    let replyParent: any = null;
    if (body.replyTo) {
      replyParent = await Post.findOne({ _id: body.replyTo, deletedAt: null });
      if (!replyParent) throw new HttpError(404, "The post you are replying to is unavailable");
    }
    if (body.repostOf) {
      const original = await Post.findOne({ _id: body.repostOf, deletedAt: null });
      if (!original || original.repostOf) throw new HttpError(400, "That post cannot be quoted");
    }

    const post = await Post.create({
      author: req.user!._id,
      text: body.text,
      attachments: body.attachments,
      replyTo: body.replyTo || null,
      repostOf: body.repostOf || null,
    });

    res.status(201).json({
      post: {
        id: String(post._id),
        text: post.text || "",
        createdAt: post.createdAt,
        attachments: (post.attachments || []).map((file: { url: string; kind?: string }) => ({ url: file.url, kind: file.kind || "image" })),
        replyTo: body.replyTo || null,
        replyToAuthor: null,
        repostOf: null,
        author: authorMini(req.user),
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        liked: false,
        reposted: false,
      },
    });

    try {
      if (replyParent) {
        replyParent.replyCount += 1;
        await replyParent.save();
        await createNotification({
          recipient: replyParent.author,
          actor: req.user!._id,
          type: "reply",
          text: `${req.user!.displayName} replied to your post`,
          link: `/post/${replyParent.id}`,
        });
      }

      if (body.repostOf && body.text) {
        await Post.updateOne({ _id: body.repostOf }, { $inc: { repostCount: 1 } });
        const original = await Post.findById(body.repostOf);
        if (original) {
          await createNotification({
            recipient: original.author,
            actor: req.user!._id,
            type: "repost",
            text: `${req.user!.displayName} quoted your post`,
            link: `/post/${post.id}`,
          });
        }
      }

      await notifyMentions(body.text, req.user, `/post/${post.id}`, [
        String(req.user!._id),
        replyParent ? String(replyParent.author) : "",
      ]);
    } catch {
      // The post is already saved and shown. A failed notice should not undo it.
    }
  }),
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, deletedAt: null }).populate(postPopulate);
    if (!post) throw new HttpError(404, "Post unavailable");
    const replies = await Post.find({ replyTo: post._id, deletedAt: null }).sort({ createdAt: 1 }).limit(50).populate(postPopulate);
    const [dto] = await presentPosts([post], String(req.user!._id));
    res.json({ post: dto, replies: await presentPosts(replies, String(req.user!._id)) });
  }),
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post || post.deletedAt) throw new HttpError(404, "Post unavailable");
    if (!sameId(post.author, req.user!._id) && req.user!.role !== "admin") throw new HttpError(403, "You cannot remove this post");
    post.deletedAt = new Date();
    await post.save();
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/like",
  wrap(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) throw new HttpError(404, "Post unavailable");
    const existing = await Like.findOne({ user: req.user!._id, post: post._id });
    if (existing) {
      await existing.deleteOne();
      post.likeCount = Math.max(0, post.likeCount - 1);
      await post.save();
      res.json({ liked: false, likeCount: post.likeCount });
      return;
    }
    await Like.create({ user: req.user!._id, post: post._id });
    post.likeCount += 1;
    await post.save();
    res.json({ liked: true, likeCount: post.likeCount });
    try {
      await createNotification({
        recipient: post.author,
        actor: req.user!._id,
        type: "like",
        text: `${req.user!.displayName} liked your post`,
        link: `/post/${post.id}`,
      });
    } catch {
      // The like is already saved.
    }
  }),
);

router.post(
  "/:id/repost",
  wrap(async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id, deletedAt: null });
    if (!post) throw new HttpError(404, "Post unavailable");
    if (post.repostOf && !post.text) throw new HttpError(400, "Repost the original post");
    const targetId = post.repostOf && !post.text ? post.repostOf : post._id;
    const original = await Post.findOne({ _id: targetId, deletedAt: null });
    if (!original) throw new HttpError(404, "Post unavailable");

    const existing = await Repost.findOne({ user: req.user!._id, post: original._id });
    if (existing) {
      if (existing.timelinePost) await Post.deleteOne({ _id: existing.timelinePost });
      await existing.deleteOne();
      original.repostCount = Math.max(0, original.repostCount - 1);
      await original.save();
      res.json({ reposted: false, repostCount: original.repostCount });
      return;
    }

    const timeline = await Post.create({
      author: req.user!._id,
      text: "",
      repostOf: original._id,
    });
    await Repost.create({ user: req.user!._id, post: original._id, timelinePost: timeline._id });
    original.repostCount += 1;
    await original.save();
    res.json({ reposted: true, repostCount: original.repostCount });
    try {
      await createNotification({
        recipient: original.author,
        actor: req.user!._id,
        type: "repost",
        text: `${req.user!.displayName} reposted your post`,
        link: `/post/${original.id}`,
      });
    } catch {
      // The repost is already saved.
    }
  }),
);

export default router;
