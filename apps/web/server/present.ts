import { PROOF_LABEL } from "./config.js";
import { Like, Proof, Repost } from "./models.js";
import { comparisonNote, snapshotLabel } from "./social.js";

export function authorMini(user: any) {
  if (!user) return null;
  return {
    id: String(user._id || user.id),
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || null,
  };
}

export function meDto(user: any) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || null,
    location: user.location || "",
    website: user.website || "",
    role: user.role,
    messagePrivacy: user.messagePrivacy,
    notificationSettings: user.notificationSettings,
    createdAt: user.createdAt,
  };
}

export async function profileDto(user: any, viewerId?: string) {
  const { Follow, Post } = await import("./models.js");
  const [followersCount, followingCount, postCount, isFollowing] = await Promise.all([
    Follow.countDocuments({ following: user._id }),
    Follow.countDocuments({ follower: user._id }),
    Post.countDocuments({ author: user._id, deletedAt: null, replyTo: null }),
    viewerId ? Follow.exists({ follower: viewerId, following: user._id }) : null,
  ]);
  const blocked = viewerId ? (user.blockedUserIds || []).some((id: unknown) => String(id) === viewerId) : false;
  return {
    ...authorMini(user),
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    createdAt: user.createdAt,
    followersCount,
    followingCount,
    postCount,
    isFollowing: Boolean(isFollowing),
    blockedYou: blocked,
  };
}

export async function presentPosts(posts: any[], viewerId?: string) {
  const visible = posts.filter((post) => post && !post.deletedAt && !(post.repostOf && post.repostOf.deletedAt));
  const ids = visible.map((post) => post._id);
  const [likes, reposts] = await Promise.all([
    viewerId ? Like.find({ user: viewerId, post: { $in: ids } }).select("post") : [],
    viewerId ? Repost.find({ user: viewerId, post: { $in: ids } }).select("post") : [],
  ]);
  const liked = new Set(likes.map((row) => String(row.post)));
  const reposted = new Set(reposts.map((row) => String(row.post)));

  return visible.map((post) => ({
    id: String(post._id),
    text: post.text || "",
    createdAt: post.createdAt,
    attachments: (post.attachments || []).map((file: any) => ({ url: file.url, kind: file.kind || "image" })),
    replyTo: post.replyTo ? String(post.replyTo._id || post.replyTo) : null,
    replyToAuthor: post.replyTo?.author?.username ? { username: post.replyTo.author.username } : null,
    repostOf: post.repostOf
      ? {
          id: String(post.repostOf._id),
          text: post.repostOf.text || "",
          createdAt: post.repostOf.createdAt,
          attachments: (post.repostOf.attachments || []).map((file: any) => ({ url: file.url, kind: "image" })),
          author: authorMini(post.repostOf.author),
        }
      : null,
    author: authorMini(post.author),
    likeCount: post.likeCount || 0,
    replyCount: post.replyCount || 0,
    repostCount: post.repostCount || 0,
    liked: liked.has(String(post._id)),
    reposted: reposted.has(String(post._id)),
  }));
}

export const postPopulate = [
  { path: "author", select: "username displayName avatarUrl" },
  {
    path: "repostOf",
    populate: { path: "author", select: "username displayName avatarUrl" },
  },
  {
    path: "replyTo",
    select: "author",
    populate: { path: "author", select: "username" },
  },
];

export async function investmentDto(record: any) {
  const proof = await Proof.findOne({ investment: record._id });
  const owner = record.owner?.username ? record.owner : null;
  return {
    id: String(record._id),
    owner: owner ? authorMini(owner) : { id: String(record.owner) },
    assetClass: record.assetClass,
    category: record.category,
    assetName: record.assetName,
    recordType: record.recordType,
    quantity: record.quantity,
    unit: record.unit,
    buyPrice: record.buyPrice,
    buyPriceApproximate: Boolean(record.buyPriceApproximate),
    sellPrice: record.sellPrice,
    priceUnit: record.priceUnit,
    buyDate: record.buyDate,
    sellDate: record.sellDate,
    notes: record.notes || "",
    returnPercent: record.returnPercent,
    profitPerUnit: record.profitPerUnit,
    returnBasis: record.recordType === "trade" ? "Price change per unit, before fees and taxes." : null,
    comparisonNote: comparisonNote(record.quantity, record.unit, record.priceUnit),
    snapshotLabel: snapshotLabel(record),
    proof: proof
      ? {
          id: String(proof._id),
          url: proof.url,
          fileName: proof.fileName,
          mimeType: proof.mimeType,
          createdAt: proof.createdAt,
          label: PROOF_LABEL,
        }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function messageDto(message: any) {
  return {
    id: String(message._id),
    conversationId: String(message.conversation?._id || message.conversation),
    text: message.deleted ? "" : message.text || "",
    imageUrl: message.deleted ? null : message.imageUrl,
    deleted: Boolean(message.deleted),
    createdAt: message.createdAt,
    author: authorMini(message.author),
  };
}

export function notificationDto(note: any) {
  return {
    id: String(note._id),
    type: note.type,
    text: note.text,
    link: note.link,
    read: note.read,
    createdAt: note.createdAt,
    actor: authorMini(note.actor),
  };
}
