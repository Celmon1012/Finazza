import { fail, table } from "./supabase.js";

const notificationDefaults = {
  likes: true,
  replies: true,
  reposts: true,
  follows: true,
  mentions: true,
  chat: true,
  moderation: true,
};

type QueryOpts = {
  sort?: Record<string, number>;
  skip?: number;
  limit?: number;
  hydrate?: boolean;
  distinct?: string;
};

type Doc = {
  [key: string]: any;
  _id: string;
  id: string;
  blockedUserIds: Array<string | { _id?: string; id?: string }>;
  mutedUserIds: Array<string | { _id?: string; id?: string }>;
  members: Array<{ user: any; role: string }>;
};

export function idOf(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown };
    if (record._id || record.id) return String(record._id || record.id);
  }
  return value == null ? "" : String(value);
}

export function sameId(a: unknown, b: unknown) {
  const left = idOf(a);
  return left !== "" && left === idOf(b);
}

function iso(value: unknown) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function num(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

class Query<T> implements PromiseLike<T> {
  private opts: QueryOpts = {};

  constructor(
    private run: (opts: QueryOpts) => Promise<any[]>,
    private mode: "one" | "many",
  ) {}

  sort(spec: Record<string, number>) {
    this.opts.sort = spec;
    return this;
  }

  skip(n: number) {
    this.opts.skip = n;
    return this;
  }

  limit(n: number) {
    this.opts.limit = n;
    return this;
  }

  populate(..._args: unknown[]) {
    this.opts.hydrate = true;
    return this;
  }

  select(..._args: unknown[]) {
    return this;
  }

  distinct(field: string) {
    return this.run({ ...this.opts, distinct: field }) as Promise<string[]>;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run(this.opts)
      .then((rows) => (this.mode === "one" ? rows[0] || null : rows) as T)
      .then(onfulfilled, onrejected);
  }
}

function listQuery(run: (opts: QueryOpts) => Promise<any[]>): Query<Doc[]>;
function listQuery(run: (opts: QueryOpts) => Promise<any[]>, mode: "one"): Query<Doc | null>;
function listQuery(run: (opts: QueryOpts) => Promise<any[]>, mode: "many"): Query<Doc[]>;
function listQuery(run: (opts: QueryOpts) => Promise<any[]>, mode: "one" | "many" = "many") {
  return new Query(run, mode);
}

function windowed(query: any, opts: QueryOpts) {
  if (opts.limit == null) return query;
  const from = opts.skip || 0;
  return query.range(from, from + opts.limit - 1);
}

function quoteOr(value: string) {
  return /[,()"\s]/.test(value) ? `"${value.replace(/"/g, "")}"` : value;
}

function patternTerm(pattern: RegExp) {
  return pattern.source.replace(/\\/g, "").replace(/^\^/, "").replace(/[%_]/g, "");
}

async function profileMinis(ids: string[]) {
  const unique = [...new Set(ids.map(idOf).filter(Boolean))];
  const map = new Map<string, any>();
  if (!unique.length) return map;
  const { data, error } = await table("profiles").select("id, username, display_name, avatar_url").in("id", unique);
  fail(error);
  for (const row of data || []) {
    map.set(row.id, {
      _id: row.id,
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url || null,
    });
  }
  return map;
}

async function profilesFull(ids: string[]) {
  const unique = [...new Set(ids.map(idOf).filter(Boolean))];
  const map = new Map<string, any>();
  if (!unique.length) return map;
  const { data, error } = await table("profiles").select("*").in("id", unique);
  fail(error);
  for (const row of data || []) map.set(row.id, mapUser(row));
  return map;
}

function mapUser(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    bio: row.bio || "",
    avatarUrl: row.avatar_url,
    location: row.location || "",
    website: row.website || "",
    role: row.role,
    suspended: Boolean(row.suspended),
    messagePrivacy: row.message_privacy || "everyone",
    notificationSettings: { ...notificationDefaults, ...(row.notification_settings || {}) },
    blockedUserIds: row.blocked_user_ids || [],
    mutedUserIds: row.muted_user_ids || [],
    acceptedTermsAt: row.accepted_terms_at,
    resetTokenHash: row.reset_token_hash,
    resetTokenExpires: row.reset_token_expires,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.set = (key: string, value: unknown) => {
    doc[key] = value;
  };
  doc.markModified = () => undefined;
  doc.save = async () => {
    const patch: any = {
      display_name: doc.displayName,
      bio: doc.bio || "",
      avatar_url: doc.avatarUrl || null,
      location: doc.location || "",
      website: doc.website || "",
      role: doc.role || "user",
      suspended: Boolean(doc.suspended),
      message_privacy: doc.messagePrivacy || "everyone",
      notification_settings: doc.notificationSettings || notificationDefaults,
      blocked_user_ids: (doc.blockedUserIds || []).map(idOf),
      muted_user_ids: (doc.mutedUserIds || []).map(idOf),
      accepted_terms_at: iso(doc.acceptedTermsAt),
      reset_token_hash: doc.resetTokenHash || null,
      reset_token_expires: iso(doc.resetTokenExpires),
    };
    if (typeof doc.passwordHash === "string" && doc.passwordHash.startsWith("$2")) patch.password_hash = doc.passwordHash;
    const { error } = await table("profiles").update(patch).eq("id", doc._id);
    fail(error);
  };
  doc.populate = async (path: string) => {
    const ids = (doc[path] || []).map(idOf);
    const people = await profileMinis(ids);
    doc[path] = ids.map((id: string) => people.get(id) || { _id: id, id });
    return doc;
  };
  return doc;
}

async function loadUsers(filter: any, opts: QueryOpts) {
  let query = table("profiles").select("*");
  if (typeof filter._id === "string" || (filter._id && filter._id._id)) query = query.eq("id", idOf(filter._id));
  if (filter._id?.$ne) query = query.neq("id", idOf(filter._id.$ne));
  if (typeof filter.email === "string") query = query.eq("email", filter.email.toLowerCase());
  if (typeof filter.username === "string") query = query.eq("username", filter.username);
  if (filter.username?.$in) {
    if (!filter.username.$in.length) return [];
    query = query.in("username", filter.username.$in);
  }
  if (filter.suspended != null) query = query.eq("suspended", filter.suspended);
  if (filter.blockedUserIds) query = query.contains("blocked_user_ids", [idOf(filter.blockedUserIds)]);
  if (filter.role?.$ne) query = query.neq("role", filter.role.$ne);
  if (filter.resetTokenHash) query = query.eq("reset_token_hash", filter.resetTokenHash);
  if (filter.resetTokenExpires?.$gt) query = query.gt("reset_token_expires", iso(filter.resetTokenExpires.$gt));
  if (Array.isArray(filter.$or) && filter.$or.some((item: any) => item.email)) {
    const email = filter.$or.find((item: any) => item.email)?.email;
    const username = filter.$or.find((item: any) => typeof item.username === "string")?.username;
    query = query.or(`email.eq.${quoteOr(email)},username.eq.${quoteOr(username)}`);
  }
  if (Array.isArray(filter.$or) && filter.$or.some((item: any) => item.username instanceof RegExp || item.displayName instanceof RegExp)) {
    const parts: string[] = [];
    for (const item of filter.$or) {
      if (item.username instanceof RegExp) {
        const term = patternTerm(item.username);
        const prefix = item.username.source.startsWith("^");
        parts.push(`username.ilike.${quoteOr(prefix ? `${term}%` : `%${term}%`)}`);
      }
      if (item.displayName instanceof RegExp) parts.push(`display_name.ilike.${quoteOr(`%${patternTerm(item.displayName)}%`)}`);
    }
    if (parts.length) query = query.or(parts.join(","));
  }
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const rows = (data || []).map(mapUser);
  if (opts.distinct === "_id") return rows.map((row: any) => row._id);
  return rows;
}

async function insertUser(input: any) {
  const row = {
    email: String(input.email).toLowerCase(),
    username: String(input.username).toLowerCase(),
    password_hash: input.passwordHash,
    display_name: input.displayName,
    bio: input.bio || "",
    avatar_url: input.avatarUrl || null,
    location: input.location || "",
    website: input.website || "",
    role: input.role || "user",
    message_privacy: input.messagePrivacy || "everyone",
    accepted_terms_at: iso(input.acceptedTermsAt),
  };
  const { data, error } = await table("profiles").insert(row).select("*").single();
  fail(error);
  return mapUser(data);
}

export const User = {
  find(filter: any = {}) {
    return listQuery((opts) => loadUsers(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadUsers(filter, { ...opts, limit: opts.limit || 1 }), "one");
  },
  findById(id: unknown) {
    return listQuery((opts) => loadUsers({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    return insertUser(input);
  },
  async updateOne(filter: any, patch: any) {
    let query = table("profiles").update(patch);
    if (filter._id) query = query.eq("id", idOf(filter._id));
    if (filter.role?.$ne) query = query.neq("role", filter.role.$ne);
    const { error } = await query;
    fail(error);
  },
  async countDocuments() {
    const { count, error } = await table("profiles").select("id", { count: "exact", head: true });
    fail(error);
    return count || 0;
  },
};

function mapFollow(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    follower: row.follower_id,
    following: row.following_id,
    createdAt: row.created_at,
  };
  doc.deleteOne = async () => {
    const { error } = await table("follows").delete().eq("id", doc._id);
    fail(error);
  };
  return doc;
}

async function loadFollows(filter: any, opts: QueryOpts) {
  let query = table("follows").select("*");
  if (filter.follower) query = query.eq("follower_id", idOf(filter.follower));
  if (filter.following) query = query.eq("following_id", idOf(filter.following));
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const rows = (data || []).map(mapFollow);
  if (opts.distinct === "following") return rows.map((row: any) => row.following);
  if (opts.distinct === "_id") return rows.map((row: any) => row._id);
  return rows;
}

export const Follow = {
  find(filter: any = {}) {
    return listQuery((opts) => loadFollows(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadFollows(filter, { ...opts, limit: 1 }), "one");
  },
  async exists(filter: any) {
    const rows = await loadFollows(filter, { limit: 1 });
    return rows[0] || null;
  },
  async countDocuments(filter: any = {}) {
    let query = table("follows").select("id", { count: "exact", head: true });
    if (filter.follower) query = query.eq("follower_id", idOf(filter.follower));
    if (filter.following) query = query.eq("following_id", idOf(filter.following));
    const { count, error } = await query;
    fail(error);
    return count || 0;
  },
  async create(input: any) {
    const items = Array.isArray(input) ? input : [input];
    const rows = items.map((item) => ({ follower_id: idOf(item.follower), following_id: idOf(item.following) }));
    const { data, error } = await table("follows").insert(rows).select("*");
    fail(error);
    const docs = (data || []).map(mapFollow);
    return Array.isArray(input) ? docs : docs[0];
  },
  async deleteMany(filter: any) {
    const pairs = filter.$or || [filter];
    for (const pair of pairs) {
      const { error } = await table("follows").delete().eq("follower_id", idOf(pair.follower)).eq("following_id", idOf(pair.following));
      fail(error);
    }
  },
};

function mapPost(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    author: row.author_id,
    text: row.text || "",
    attachments: row.attachments || [],
    replyTo: row.reply_to,
    repostOf: row.repost_of,
    likeCount: row.like_count || 0,
    replyCount: row.reply_count || 0,
    repostCount: row.repost_count || 0,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.save = async () => {
    const { error } = await table("posts")
      .update({
        text: doc.text || "",
        attachments: doc.attachments || [],
        like_count: doc.likeCount || 0,
        reply_count: doc.replyCount || 0,
        repost_count: doc.repostCount || 0,
        deleted_at: iso(doc.deletedAt),
      })
      .eq("id", doc._id);
    fail(error);
  };
  doc.deleteOne = async () => {
    const { error } = await table("posts").delete().eq("id", doc._id);
    fail(error);
  };
  doc.populate = async () => hydratePosts([row]).then((posts) => Object.assign(doc, posts[0]));
  return doc;
}

async function hydratePosts(rows: any[]) {
  if (!rows.length) return [];
  const relatedIds = [...new Set(rows.flatMap((row) => [row.reply_to, row.repost_of].filter(Boolean)))];
  let related: any[] = [];
  if (relatedIds.length) {
    const { data, error } = await table("posts").select("*").in("id", relatedIds);
    fail(error);
    related = data || [];
  }
  const minis = await profileMinis([...rows.map((row) => row.author_id), ...related.map((row) => row.author_id)]);
  const relatedById = new Map(related.map((row) => [row.id, row]));
  return rows.map((row) => {
    const doc = mapPost(row);
    doc.author = minis.get(row.author_id) || { _id: row.author_id, id: row.author_id };
    const reply = row.reply_to ? relatedById.get(row.reply_to) : null;
    doc.replyTo = row.reply_to
      ? { _id: row.reply_to, id: row.reply_to, author: reply ? minis.get(reply.author_id) || null : null }
      : null;
    const original = row.repost_of ? relatedById.get(row.repost_of) : null;
    doc.repostOf = original
      ? {
          _id: original.id,
          id: original.id,
          text: original.text || "",
          createdAt: original.created_at,
          attachments: original.attachments || [],
          deletedAt: original.deleted_at,
          author: minis.get(original.author_id) || null,
        }
      : null;
    return doc;
  });
}

async function loadPosts(filter: any, opts: QueryOpts) {
  let query = table("posts").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (filter.deletedAt === null) query = query.is("deleted_at", null);
  if ("replyTo" in filter) query = filter.replyTo ? query.eq("reply_to", idOf(filter.replyTo)) : query.is("reply_to", null);
  if (typeof filter.author === "string" || filter.author?._id) query = query.eq("author_id", idOf(filter.author));
  if (filter.author?.$in) {
    const ids = filter.author.$in.map(idOf).filter(Boolean);
    if (!ids.length) return [];
    query = query.in("author_id", ids);
  }
  if (filter.author?.$nin?.length) query = query.not("author_id", "in", `(${filter.author.$nin.map(idOf).filter(Boolean).join(",")})`);
  if (filter.text instanceof RegExp) query = query.ilike("text", `%${patternTerm(filter.text)}%`);
  if (opts.sort?.createdAt === 1) query = query.order("created_at", { ascending: true });
  if (opts.sort?.createdAt === -1) query = query.order("created_at", { ascending: false });
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  return opts.hydrate ? hydratePosts(data || []) : (data || []).map(mapPost);
}

async function insertPost(input: any) {
  const row: any = {
    author_id: idOf(input.author),
    text: input.text || "",
    attachments: input.attachments || [],
    reply_to: input.replyTo ? idOf(input.replyTo) : null,
    repost_of: input.repostOf ? idOf(input.repostOf) : null,
    like_count: input.likeCount || 0,
    reply_count: input.replyCount || 0,
    repost_count: input.repostCount || 0,
  };
  if (input.createdAt) row.created_at = iso(input.createdAt);
  const { data, error } = await table("posts").insert(row).select("*").single();
  fail(error);
  return mapPost(data);
}

export const Post = {
  find(filter: any = {}) {
    return listQuery((opts) => loadPosts(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadPosts(filter, { ...opts, limit: 1 }), "one");
  },
  findById(id: unknown) {
    return listQuery((opts) => loadPosts({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    return insertPost(input);
  },
  async updateOne(filter: any, patch: any) {
    if (patch.$inc?.repostCount) {
      const post = await loadPosts({ _id: idOf(filter._id) }, { limit: 1 }).then((rows) => rows[0]);
      if (!post) return;
      post.repostCount += patch.$inc.repostCount;
      await post.save();
    }
  },
  async deleteOne(filter: any) {
    const { error } = await table("posts").delete().eq("id", idOf(filter._id));
    fail(error);
  },
  async countDocuments(filter: any = {}) {
    let query = table("posts").select("id", { count: "exact", head: true });
    if (filter.author) query = query.eq("author_id", idOf(filter.author));
    if (filter.deletedAt === null) query = query.is("deleted_at", null);
    if ("replyTo" in filter && filter.replyTo == null) query = query.is("reply_to", null);
    const { count, error } = await query;
    fail(error);
    return count || 0;
  },
};

function mapLike(row: any) {
  const doc: any = { _id: row.id, id: row.id, user: row.user_id, post: row.post_id, createdAt: row.created_at };
  doc.deleteOne = async () => {
    const { error } = await table("likes").delete().eq("id", doc._id);
    fail(error);
  };
  return doc;
}

async function loadLikes(filter: any, opts: QueryOpts) {
  let query = table("likes").select("*");
  if (filter.user) query = query.eq("user_id", idOf(filter.user));
  if (filter.post?.$in) {
    const ids = filter.post.$in.map(idOf).filter(Boolean);
    if (!ids.length) return [];
    query = query.in("post_id", ids);
  } else if (filter.post) query = query.eq("post_id", idOf(filter.post));
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  return (data || []).map(mapLike);
}

export const Like = {
  find(filter: any = {}) {
    return listQuery((opts) => loadLikes(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadLikes(filter, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    const { data, error } = await table("likes").insert({ user_id: idOf(input.user), post_id: idOf(input.post) }).select("*").single();
    fail(error);
    return mapLike(data);
  },
};

function mapRepost(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    user: row.user_id,
    post: row.post_id,
    timelinePost: row.timeline_post_id,
    createdAt: row.created_at,
  };
  doc.deleteOne = async () => {
    const { error } = await table("reposts").delete().eq("id", doc._id);
    fail(error);
  };
  return doc;
}

async function loadReposts(filter: any, opts: QueryOpts) {
  let query = table("reposts").select("*");
  if (filter.user) query = query.eq("user_id", idOf(filter.user));
  if (filter.post?.$in) {
    const ids = filter.post.$in.map(idOf).filter(Boolean);
    if (!ids.length) return [];
    query = query.in("post_id", ids);
  } else if (filter.post) query = query.eq("post_id", idOf(filter.post));
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  return (data || []).map(mapRepost);
}

export const Repost = {
  find(filter: any = {}) {
    return listQuery((opts) => loadReposts(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadReposts(filter, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    const { data, error } = await table("reposts")
      .insert({
        user_id: idOf(input.user),
        post_id: idOf(input.post),
        timeline_post_id: input.timelinePost ? idOf(input.timelinePost) : null,
      })
      .select("*")
      .single();
    fail(error);
    return mapRepost(data);
  },
};

function mapInvestment(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    owner: row.owner_id,
    assetClass: row.asset_class,
    category: row.category,
    assetName: row.asset_name,
    recordType: row.record_type,
    quantity: num(row.quantity),
    unit: row.unit,
    buyPrice: num(row.buy_price),
    sellPrice: num(row.sell_price),
    priceUnit: row.price_unit,
    buyDate: row.buy_date,
    sellDate: row.sell_date,
    notes: row.notes || "",
    returnPercent: num(row.return_percent),
    profitPerUnit: num(row.profit_per_unit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.save = async () => {
    const { error } = await table("investments")
      .update({
        asset_class: doc.assetClass,
        category: doc.category || null,
        asset_name: doc.assetName,
        record_type: doc.recordType,
        quantity: doc.quantity,
        unit: doc.unit,
        buy_price: doc.buyPrice,
        sell_price: doc.sellPrice,
        price_unit: doc.priceUnit,
        buy_date: iso(doc.buyDate),
        sell_date: iso(doc.sellDate),
        notes: doc.notes || "",
        return_percent: doc.returnPercent,
        profit_per_unit: doc.profitPerUnit,
      })
      .eq("id", doc._id);
    fail(error);
  };
  doc.deleteOne = async () => {
    const { error } = await table("investments").delete().eq("id", doc._id);
    fail(error);
  };
  doc.populate = async () => {
    const people = await profileMinis([idOf(doc.owner)]);
    doc.owner = people.get(idOf(doc.owner)) || doc.owner;
    return doc;
  };
  return doc;
}

async function loadInvestments(filter: any, opts: QueryOpts) {
  let query = table("investments").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (filter.owner) query = query.eq("owner_id", idOf(filter.owner));
  if (opts.sort?.updatedAt === -1) query = query.order("updated_at", { ascending: false });
  if (opts.sort?.createdAt === -1) query = query.order("created_at", { ascending: false });
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const docs = (data || []).map(mapInvestment);
  if (!opts.hydrate) return docs;
  const people = await profileMinis(docs.map((doc: any) => doc.owner));
  return docs.map((doc: any) => {
    doc.owner = people.get(idOf(doc.owner)) || doc.owner;
    return doc;
  });
}

function investmentRow(input: any) {
  return {
    owner_id: idOf(input.owner),
    asset_class: input.assetClass,
    category: input.category || null,
    asset_name: input.assetName,
    record_type: input.recordType,
    quantity: input.quantity,
    unit: input.unit,
    buy_price: input.buyPrice,
    sell_price: input.sellPrice ?? null,
    price_unit: input.priceUnit,
    buy_date: iso(input.buyDate),
    sell_date: iso(input.sellDate),
    notes: input.notes || "",
    return_percent: input.returnPercent ?? null,
    profit_per_unit: input.profitPerUnit ?? null,
  };
}

export const Investment = {
  find(filter: any = {}) {
    return listQuery((opts) => loadInvestments(filter, opts));
  },
  findById(id: unknown) {
    return listQuery((opts) => loadInvestments({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    const { data, error } = await table("investments").insert(investmentRow(input)).select("*").single();
    fail(error);
    return mapInvestment(data);
  },
};

function mapProof(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    investment: row.investment_id,
    uploader: row.uploader_id,
    url: row.url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    redactionConfirmed: row.redaction_confirmed,
    label: row.label,
    createdAt: row.created_at,
  };
  doc.deleteOne = async () => {
    const { error } = await table("proofs").delete().eq("id", doc._id);
    fail(error);
  };
  return doc;
}

async function loadProofs(filter: any, opts: QueryOpts) {
  let query = table("proofs").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (filter.investment) query = query.eq("investment_id", idOf(filter.investment));
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  return (data || []).map(mapProof);
}

export const Proof = {
  findOne(filter: any) {
    return listQuery((opts) => loadProofs(filter, { ...opts, limit: 1 }), "one");
  },
  findById(id: unknown) {
    return listQuery((opts) => loadProofs({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    const { data, error } = await table("proofs")
      .insert({
        investment_id: idOf(input.investment),
        uploader_id: idOf(input.uploader),
        url: input.url,
        file_name: input.fileName,
        mime_type: input.mimeType,
        redaction_confirmed: Boolean(input.redactionConfirmed),
        label: input.label,
      })
      .select("*")
      .single();
    fail(error);
    return mapProof(data);
  },
};

async function syncMembers(conversationId: string, members: any[]) {
  const { error: deleteError } = await table("conversation_members").delete().eq("conversation_id", conversationId);
  fail(deleteError);
  const rows = members
    .map((member) => ({
      conversation_id: conversationId,
      user_id: idOf(member.user),
      role: member.role || "member",
    }))
    .filter((member) => member.user_id);
  if (!rows.length) return;
  const { error } = await table("conversation_members").insert(rows);
  fail(error);
}

function mapConversation(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    type: row.type,
    name: row.name || "",
    slug: row.slug,
    description: row.description || "",
    createdBy: row.created_by,
    lastMessageAt: row.last_message_at,
    lastMessageText: row.last_message_text || "",
    members: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.save = async () => {
    const { error } = await table("conversations")
      .update({
        name: doc.name || "",
        slug: doc.slug || null,
        description: doc.description || "",
        last_message_at: iso(doc.lastMessageAt),
        last_message_text: doc.lastMessageText || "",
      })
      .eq("id", doc._id);
    fail(error);
    if (Array.isArray(doc.members)) await syncMembers(doc._id, doc.members);
  };
  doc.deleteOne = async () => {
    const { error } = await table("conversations").delete().eq("id", doc._id);
    fail(error);
  };
  doc.populate = async () => {
    const [hydrated] = await attachMembers([doc], true);
    return hydrated;
  };
  return doc;
}

async function attachMembers(docs: any[], hydrate: boolean) {
  if (!docs.length) return docs;
  const { data, error } = await table("conversation_members").select("*").in(
    "conversation_id",
    docs.map((doc) => doc._id),
  );
  fail(error);
  const people = hydrate ? await profilesFull((data || []).map((row: any) => row.user_id)) : new Map<string, any>();
  const grouped = new Map<string, any[]>();
  for (const row of data || []) {
    const list = grouped.get(row.conversation_id) || [];
    list.push({ user: hydrate ? people.get(row.user_id) || { _id: row.user_id, id: row.user_id } : row.user_id, role: row.role });
    grouped.set(row.conversation_id, list);
  }
  for (const doc of docs) doc.members = grouped.get(doc._id) || [];
  return docs;
}

async function memberConversationIds(userId: string): Promise<string[]> {
  const { data, error } = await table("conversation_members").select("conversation_id").eq("user_id", userId);
  fail(error);
  return ((data || []) as Array<{ conversation_id: string }>).map((row) => row.conversation_id);
}

async function loadConversations(filter: any, opts: QueryOpts) {
  let rows: any[] = [];
  if (filter.type === "dm" && Array.isArray(filter.$and)) {
    const [first, second] = filter.$and.map((item: any) => idOf(item["members.user"]));
    const secondIds = new Set(await memberConversationIds(second));
    const shared = (await memberConversationIds(first)).filter((id) => secondIds.has(id));
    if (!shared.length) return [];
    const { data, error } = await table("conversations").select("*").eq("type", "dm").in("id", shared);
    fail(error);
    rows = data || [];
  } else if (Array.isArray(filter.$or)) {
    const collected = new Map<string, any>();
    if (filter.$or.some((item: any) => item.type === "topic")) {
      const { data, error } = await table("conversations").select("*").eq("type", "topic");
      fail(error);
      for (const row of data || []) collected.set(row.id, row);
    }
    const member = filter.$or.find((item: any) => item["members.user"]);
    if (member) {
      const ids = await memberConversationIds(idOf(member["members.user"]));
      if (ids.length) {
        const { data, error } = await table("conversations").select("*").in("id", ids);
        fail(error);
        for (const row of data || []) collected.set(row.id, row);
      }
    }
    rows = [...collected.values()];
  } else {
    let query = table("conversations").select("*");
    if (filter._id) query = query.eq("id", idOf(filter._id));
    if (filter.slug) query = query.eq("slug", filter.slug);
    if (typeof filter.type === "string") query = query.eq("type", filter.type);
    if (filter.type?.$in && filter["members.user"]) {
      const ids = await memberConversationIds(idOf(filter["members.user"]));
      if (!ids.length) return [];
      query = query.in("id", ids).in("type", filter.type.$in);
    }
    const { data, error } = await query;
    fail(error);
    rows = data || [];
  }

  if (opts.sort?.lastMessageAt) {
    rows.sort((a, b) => {
      const left = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const right = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      if (right !== left) return opts.sort?.lastMessageAt === 1 ? left - right : right - left;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }
  if (opts.skip || opts.limit != null) {
    const start = opts.skip || 0;
    rows = rows.slice(start, opts.limit != null ? start + opts.limit : undefined);
  }
  const docs = rows.map(mapConversation);
  return attachMembers(docs, Boolean(opts.hydrate));
}

async function insertConversation(input: any) {
  const row: any = {
    type: input.type,
    name: input.name || "",
    slug: input.slug || null,
    description: input.description || "",
    created_by: idOf(input.createdBy),
    last_message_text: input.lastMessageText || "",
  };
  if (input.lastMessageAt) row.last_message_at = iso(input.lastMessageAt);
  const { data, error } = await table("conversations").insert(row).select("*").single();
  fail(error);
  if (input.members?.length) await syncMembers(data.id, input.members);
  const [doc] = await attachMembers([mapConversation(data)], false);
  return doc;
}

export const Conversation = {
  find(filter: any = {}) {
    return listQuery((opts) => loadConversations(filter, opts));
  },
  findOne(filter: any) {
    return listQuery((opts) => loadConversations(filter, { ...opts, limit: 1 }), "one");
  },
  findById(id: unknown) {
    return listQuery((opts) => loadConversations({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    if (Array.isArray(input)) return Promise.all(input.map((item) => insertConversation(item)));
    return insertConversation(input);
  },
  async updateOne(filter: any, patch: any) {
    const convo = (await loadConversations({ _id: idOf(filter._id) }, { limit: 1 }))[0];
    if (!convo) return;
    if (patch.$set?.members) {
      convo.members = patch.$set.members;
      await convo.save();
    }
  },
};

function mapMessage(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    conversation: row.conversation_id,
    author: row.author_id,
    text: row.text || "",
    imageUrl: row.image_url,
    deleted: Boolean(row.deleted),
    createdAt: row.created_at,
  };
  doc.save = async () => {
    const { error } = await table("messages")
      .update({ text: doc.text || "", image_url: doc.imageUrl, deleted: Boolean(doc.deleted) })
      .eq("id", doc._id);
    fail(error);
  };
  doc.populate = async () => {
    const people = await profileMinis([idOf(doc.author)]);
    doc.author = people.get(idOf(doc.author)) || doc.author;
    return doc;
  };
  return doc;
}

async function loadMessages(filter: any, opts: QueryOpts) {
  let query = table("messages").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (filter.conversation) query = query.eq("conversation_id", idOf(filter.conversation));
  if (filter.deleted === false) query = query.eq("deleted", false);
  if (filter.author?.$ne) query = query.neq("author_id", idOf(filter.author.$ne));
  if (filter.createdAt?.$gt) query = query.gt("created_at", iso(filter.createdAt.$gt));
  if (filter.createdAt?.$lt) query = query.lt("created_at", iso(filter.createdAt.$lt));
  if (opts.sort?.createdAt === -1) query = query.order("created_at", { ascending: false });
  if (opts.sort?.createdAt === 1) query = query.order("created_at", { ascending: true });
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const docs = (data || []).map(mapMessage);
  if (!opts.hydrate) return docs;
  const people = await profileMinis(docs.map((doc: any) => doc.author));
  return docs.map((doc: any) => {
    doc.author = people.get(idOf(doc.author)) || doc.author;
    return doc;
  });
}

async function insertMessage(input: any) {
  const row: any = {
    conversation_id: idOf(input.conversation),
    author_id: idOf(input.author),
    text: input.text || "",
    image_url: input.imageUrl || null,
    deleted: Boolean(input.deleted),
  };
  if (input.createdAt) row.created_at = iso(input.createdAt);
  const { data, error } = await table("messages").insert(row).select("*").single();
  fail(error);
  return mapMessage(data);
}

export const Message = {
  find(filter: any = {}) {
    return listQuery((opts) => loadMessages(filter, opts));
  },
  findById(id: unknown) {
    return listQuery((opts) => loadMessages({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    if (Array.isArray(input)) return Promise.all(input.map((item) => insertMessage(item)));
    return insertMessage(input);
  },
  async countDocuments(filter: any = {}) {
    let query = table("messages").select("id", { count: "exact", head: true });
    if (filter.conversation) query = query.eq("conversation_id", idOf(filter.conversation));
    if (filter.deleted === false) query = query.eq("deleted", false);
    if (filter.author?.$ne) query = query.neq("author_id", idOf(filter.author.$ne));
    if (filter.createdAt?.$gt) query = query.gt("created_at", iso(filter.createdAt.$gt));
    const { count, error } = await query;
    fail(error);
    return count || 0;
  },
  async deleteMany(filter: any) {
    const { error } = await table("messages").delete().eq("conversation_id", idOf(filter.conversation));
    fail(error);
  },
};

function mapReadState(row: any) {
  return {
    _id: `${row.user_id}:${row.conversation_id}`,
    user: row.user_id,
    conversation: row.conversation_id,
    lastReadAt: row.last_read_at,
  };
}

async function upsertReadStates(items: any[]) {
  const rows = items.map((item) => ({
    user_id: idOf(item.user),
    conversation_id: idOf(item.conversation),
    last_read_at: iso(item.lastReadAt) || new Date().toISOString(),
  }));
  const { data, error } = await table("read_states").upsert(rows, { onConflict: "user_id,conversation_id" }).select("*");
  fail(error);
  return (data || []).map(mapReadState);
}

export const ReadState = {
  findOne(filter: any) {
    return listQuery(async () => {
      const { data, error } = await table("read_states")
        .select("*")
        .eq("user_id", idOf(filter.user))
        .eq("conversation_id", idOf(filter.conversation))
        .limit(1);
      fail(error);
      return (data || []).map(mapReadState);
    }, "one");
  },
  async findOneAndUpdate(filter: any, patch: any, _opts?: unknown) {
    const [doc] = await upsertReadStates([{ user: filter.user, conversation: filter.conversation, lastReadAt: patch.lastReadAt }]);
    return doc || null;
  },
  async insertMany(items: any[], _opts?: unknown) {
    if (!items.length) return [];
    return upsertReadStates(items);
  },
  async create(input: any) {
    const docs = await upsertReadStates(Array.isArray(input) ? input : [input]);
    return Array.isArray(input) ? docs : docs[0];
  },
};

function mapNotification(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    recipient: row.recipient_id,
    actor: row.actor_id,
    type: row.type,
    text: row.text,
    link: row.link,
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
  doc.save = async () => {
    const { error } = await table("notifications").update({ read: Boolean(doc.read) }).eq("id", doc._id);
    fail(error);
  };
  doc.populate = async () => {
    if (!doc.actor) return doc;
    const people = await profileMinis([idOf(doc.actor)]);
    doc.actor = people.get(idOf(doc.actor)) || null;
    return doc;
  };
  return doc;
}

async function loadNotifications(filter: any, opts: QueryOpts) {
  let query = table("notifications").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (filter.recipient) query = query.eq("recipient_id", idOf(filter.recipient));
  if (filter.read === false) query = query.eq("read", false);
  if (opts.sort?.createdAt === -1) query = query.order("created_at", { ascending: false });
  if (opts.sort?.createdAt === 1) query = query.order("created_at", { ascending: true });
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const docs = (data || []).map(mapNotification);
  if (!opts.hydrate) return docs;
  const people = await profileMinis(docs.map((doc: any) => doc.actor).filter(Boolean));
  return docs.map((doc: any) => {
    doc.actor = doc.actor ? people.get(idOf(doc.actor)) || null : null;
    return doc;
  });
}

export const Notification = {
  find(filter: any = {}) {
    return listQuery((opts) => loadNotifications(filter, opts));
  },
  async create(input: any) {
    const { data, error } = await table("notifications")
      .insert({
        recipient_id: idOf(input.recipient),
        actor_id: input.actor ? idOf(input.actor) : null,
        type: input.type,
        text: input.text,
        link: input.link,
      })
      .select("*")
      .single();
    fail(error);
    return mapNotification(data);
  },
  async countDocuments(filter: any = {}) {
    let query = table("notifications").select("id", { count: "exact", head: true });
    if (filter.recipient) query = query.eq("recipient_id", idOf(filter.recipient));
    if (filter.read === false) query = query.eq("read", false);
    const { count, error } = await query;
    fail(error);
    return count || 0;
  },
  async updateMany(filter: any, patch: any) {
    let query = table("notifications").update(patch);
    if (filter.recipient) query = query.eq("recipient_id", idOf(filter.recipient));
    if (filter.read === false) query = query.eq("read", false);
    const { error } = await query;
    fail(error);
  },
  async updateOne(filter: any, patch: any) {
    let query = table("notifications").update(patch);
    if (filter._id) query = query.eq("id", idOf(filter._id));
    if (filter.recipient) query = query.eq("recipient_id", idOf(filter.recipient));
    const { error } = await query;
    fail(error);
  },
};

function mapReport(row: any) {
  const doc: any = {
    _id: row.id,
    id: row.id,
    reporter: row.reporter_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details || "",
    status: row.status,
    createdAt: row.created_at,
  };
  doc.save = async () => {
    const { error } = await table("reports").update({ status: doc.status }).eq("id", doc._id);
    fail(error);
  };
  return doc;
}

async function loadReports(filter: any, opts: QueryOpts) {
  let query = table("reports").select("*");
  if (filter._id) query = query.eq("id", idOf(filter._id));
  if (opts.sort?.createdAt === -1) query = query.order("created_at", { ascending: false });
  query = windowed(query, opts);
  const { data, error } = await query;
  fail(error);
  const docs = (data || []).map(mapReport);
  if (!opts.hydrate) return docs;
  const people = await profileMinis(docs.map((doc: any) => doc.reporter));
  return docs.map((doc: any) => {
    doc.reporter = people.get(idOf(doc.reporter)) || doc.reporter;
    return doc;
  });
}

export const Report = {
  find(filter: any = {}) {
    return listQuery((opts) => loadReports(filter, opts));
  },
  findById(id: unknown) {
    return listQuery((opts) => loadReports({ _id: idOf(id) }, { ...opts, limit: 1 }), "one");
  },
  async create(input: any) {
    const { data, error } = await table("reports")
      .insert({
        reporter_id: idOf(input.reporter),
        target_type: input.targetType,
        target_id: idOf(input.targetId),
        reason: input.reason,
        details: input.details || "",
      })
      .select("*")
      .single();
    fail(error);
    return mapReport(data);
  },
};

export type NotificationSettings = typeof notificationDefaults;
