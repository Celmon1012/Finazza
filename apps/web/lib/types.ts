export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string;
};

export type Me = PublicUser & {
  email: string;
  location: string;
  website: string;
  role: "user" | "admin";
  messagePrivacy: "everyone" | "followers";
  notificationSettings: {
    likes: boolean;
    replies: boolean;
    reposts: boolean;
    follows: boolean;
    mentions: boolean;
    chat: boolean;
    moderation: boolean;
  };
  createdAt: string;
};

export type Profile = PublicUser & {
  bio: string;
  location: string;
  website: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  blockedYou: boolean;
  youBlocked: boolean;
  youMuted: boolean;
};

export type Post = {
  id: string;
  text: string;
  createdAt: string;
  attachments: { url: string; kind: "image" }[];
  replyTo: string | null;
  replyToAuthor: { username: string } | null;
  repostOf: null | {
    id: string;
    text: string;
    createdAt: string;
    attachments: { url: string; kind: "image" }[];
    author: PublicUser | null;
  };
  author: PublicUser | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
};

export type Proof = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  label: string;
};

export type Investment = {
  id: string;
  owner: PublicUser;
  assetClass: "stock" | "etf" | "commodity" | "collectible" | "other";
  category: string | null;
  assetName: string;
  recordType: "trade" | "holding";
  quantity: number;
  unit: string;
  buyPrice: number;
  buyPriceApproximate: boolean;
  sellPrice: number | null;
  priceUnit: string;
  buyDate: string;
  sellDate: string | null;
  notes: string;
  returnPercent: number | null;
  profitPerUnit: number | null;
  returnBasis: string | null;
  comparisonNote: string | null;
  snapshotLabel: string;
  proof: Proof | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  type: "topic" | "dm" | "group";
  name: string;
  slug: string | null;
  description: string;
  avatarUrl: string | null;
  members: (PublicUser & { role: "admin" | "member" })[];
  memberCount: number | null;
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  /** Only set on a voice message that is still uploading. */
  audioSeconds?: number;
  deleted: boolean;
  createdAt: string;
  author: PublicUser | null;
};

export type AppNotification = {
  id: string;
  type: string;
  text: string;
  link: string;
  read: boolean;
  createdAt: string;
  actor: PublicUser | null;
};

export type Report = {
  id: string;
  targetType: "post" | "message" | "proof" | "user";
  targetId: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  reporter: PublicUser | null;
};
