import mongoose, { Schema, type Types } from "mongoose";

const notificationDefaults = {
  likes: true,
  replies: true,
  reposts: true,
  follows: true,
  mentions: true,
  chat: true,
  moderation: true,
};

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "", maxlength: 160 },
    avatarUrl: { type: String, default: null },
    location: { type: String, default: "", maxlength: 40 },
    website: { type: String, default: "", maxlength: 160 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    suspended: { type: Boolean, default: false },
    messagePrivacy: { type: String, enum: ["everyone", "followers"], default: "everyone" },
    notificationSettings: {
      likes: { type: Boolean, default: true },
      replies: { type: Boolean, default: true },
      reposts: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      moderation: { type: Boolean, default: true },
    },
    blockedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    mutedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    acceptedTermsAt: { type: Date, default: null },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

UserSchema.set("toJSON", {
  transform(_doc, ret) {
    const copy = ret as Record<string, unknown>;
    delete copy.passwordHash;
    delete copy.resetTokenHash;
    delete copy.resetTokenExpires;
    return copy;
  },
});

const FollowSchema = new Schema(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const AttachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    kind: { type: String, enum: ["image"], default: "image" },
  },
  { _id: false },
);

const PostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, default: "", maxlength: 500 },
    attachments: { type: [AttachmentSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    repostOf: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    likeCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    repostCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
PostSchema.index({ createdAt: -1 });

const LikeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: true },
);
LikeSchema.index({ user: 1, post: 1 }, { unique: true });

const RepostSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    timelinePost: { type: Schema.Types.ObjectId, ref: "Post", default: null },
  },
  { timestamps: true },
);
RepostSchema.index({ user: 1, post: 1 }, { unique: true });

const InvestmentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assetClass: {
      type: String,
      enum: ["stock", "etf", "commodity", "collectible", "other"],
      required: true,
    },
    category: { type: String, default: null },
    assetName: { type: String, required: true, trim: true, maxlength: 80 },
    recordType: { type: String, enum: ["trade", "holding"], required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    buyPrice: { type: Number, required: true },
    sellPrice: { type: Number, default: null },
    priceUnit: { type: String, required: true },
    buyDate: { type: Date, required: true },
    sellDate: { type: Date, default: null },
    notes: { type: String, default: "", maxlength: 500 },
    returnPercent: { type: Number, default: null },
    profitPerUnit: { type: Number, default: null },
  },
  { timestamps: true },
);

const ProofSchema = new Schema(
  {
    investment: { type: Schema.Types.ObjectId, ref: "Investment", required: true, unique: true },
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    url: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    redactionConfirmed: { type: Boolean, required: true },
    label: { type: String, required: true },
  },
  { timestamps: true },
);

const MemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { _id: false },
);

const ConversationSchema = new Schema(
  {
    type: { type: String, enum: ["topic", "dm", "group"], required: true },
    name: { type: String, default: "" },
    slug: { type: String, default: null },
    description: { type: String, default: "" },
    members: { type: [MemberSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date, default: null },
    lastMessageText: { type: String, default: "" },
  },
  { timestamps: true },
);
ConversationSchema.index({ type: 1, slug: 1 });

const MessageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "", maxlength: 1000 },
    imageUrl: { type: String, default: null },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
MessageSchema.index({ conversation: 1, createdAt: -1 });

const ReadStateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    lastReadAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);
ReadStateSchema.index({ user: 1, conversation: 1 }, { unique: true });

const NotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      enum: ["like", "reply", "repost", "follow", "mention", "chat", "moderation"],
      required: true,
    },
    text: { type: String, required: true },
    link: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
NotificationSchema.index({ recipient: 1, createdAt: -1 });

const ReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "message", "proof", "user"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: ["spam", "misleading", "harassment", "other"], required: true },
    details: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
export const Follow = mongoose.model("Follow", FollowSchema);
export const Post = mongoose.model("Post", PostSchema);
export const Like = mongoose.model("Like", LikeSchema);
export const Repost = mongoose.model("Repost", RepostSchema);
export const Investment = mongoose.model("Investment", InvestmentSchema);
export const Proof = mongoose.model("Proof", ProofSchema);
export const Conversation = mongoose.model("Conversation", ConversationSchema);
export const Message = mongoose.model("Message", MessageSchema);
export const ReadState = mongoose.model("ReadState", ReadStateSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const Report = mongoose.model("Report", ReportSchema);

export type NotificationSettings = typeof notificationDefaults;
export type Id = Types.ObjectId;

export function sameId(a: unknown, b: unknown) {
  return String(a) === String(b);
}
