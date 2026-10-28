import bcrypt from "bcryptjs";
import {
  Conversation,
  Follow,
  Investment,
  Like,
  Message,
  Notification,
  Post,
  Proof,
  ReadState,
  Repost,
  User,
} from "./models.js";
import { PROOF_LABEL } from "./config.js";
import { createNotification } from "./notify.js";
import { computeReturn } from "./social.js";
import { saveSvgImage } from "./storage.js";

const DEMO_PASSWORD = "password123";

function daysAgo(days: number, hours = 0) {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
}

const receiptSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="480" viewBox="0 0 800 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="480" fill="#fff8ea"/>
  <rect x="36" y="28" width="728" height="424" rx="18" fill="#ffffff" stroke="#e7d3a1"/>
  <text x="68" y="88" font-family="Georgia, serif" font-size="30" fill="#1a1004">Sample bullion receipt</text>
  <text x="68" y="124" font-family="Arial, sans-serif" font-size="16" fill="#6b5a3e">Demo file. Personal details already removed.</text>
  <text x="68" y="196" font-family="Arial, sans-serif" font-size="22" fill="#1a1004">Silver bullion · 5 kg</text>
  <text x="68" y="236" font-family="Arial, sans-serif" font-size="22" fill="#1a1004">Reference price · $30 / troy oz</text>
  <text x="68" y="276" font-family="Arial, sans-serif" font-size="22" fill="#1a1004">Date · 12 Mar 2026</text>
  <text x="68" y="360" font-family="Arial, sans-serif" font-size="15" fill="#8a6a32">User-submitted proof. Not verified by FINAZZA.</text>
</svg>`;

const chartSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="960" height="540" viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg">
  <rect width="960" height="540" fill="#101114"/>
  <text x="48" y="54" font-family="Arial, sans-serif" font-size="22" fill="#ffc14d">Gold chart upload</text>
  <text x="48" y="84" font-family="Arial, sans-serif" font-size="14" fill="#8b919a">Drawn sample. No live market feed.</text>
  <g stroke="#2a2e35" stroke-width="1">
    <line x1="48" y1="140" x2="900" y2="140"/>
    <line x1="48" y1="220" x2="900" y2="220"/>
    <line x1="48" y1="300" x2="900" y2="300"/>
    <line x1="48" y1="380" x2="900" y2="380"/>
    <line x1="48" y1="460" x2="900" y2="460"/>
  </g>
  <polyline fill="none" stroke="#ff7a18" stroke-width="4" points="60,400 140,370 210,390 280,320 360,340 440,250 520,270 600,210 690,230 780,150 880,170"/>
  <line x1="210" y1="390" x2="690" y2="230" stroke="#ffc14d" stroke-width="2" stroke-dasharray="8 6"/>
  <polygon points="690,230 674,246 700,236" fill="#ffc14d"/>
  <text x="706" y="220" font-family="Arial, sans-serif" font-size="16" fill="#ffc14d">trend</text>
</svg>`;

async function makeUser(input: {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  role?: "user" | "admin";
}) {
  return User.create({
    ...input,
    role: input.role || "user",
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
    acceptedTermsAt: new Date(),
  });
}

export async function seedIfEmpty() {
  if ((await User.countDocuments()) > 0) {
    console.log("Users already exist — demo seed skipped");
    return;
  }

  const [admin, alex, jordan, sam] = await Promise.all([
    makeUser({
      email: "admin@finazza.dev",
      username: "admin",
      displayName: "FINAZZA Admin",
      bio: "Rooms, reports, and removed posts.",
      location: "Moderation",
      role: "admin",
    }),
    makeUser({
      email: "alex@finazza.dev",
      username: "alex",
      displayName: "Alex Morgan",
      bio: "Bullion and the occasional listed share. Proof stays public, and redacted.",
      location: "Lisbon",
    }),
    makeUser({
      email: "jordan@finazza.dev",
      username: "jordan",
      displayName: "Jordan Lee",
      bio: "Charts I upload myself. Not signals.",
      location: "Austin",
    }),
    makeUser({
      email: "sam@finazza.dev",
      username: "sam",
      displayName: "Sam Rivera",
      bio: "Graded cards, coins, and the long hold.",
      location: "Chicago",
    }),
  ]);

  await Follow.create([
    { follower: alex._id, following: jordan._id },
    { follower: alex._id, following: sam._id },
    { follower: jordan._id, following: alex._id },
    { follower: sam._id, following: alex._id },
    { follower: sam._id, following: jordan._id },
  ]);

  const card = await Investment.create({
    owner: alex._id,
    assetClass: "collectible",
    category: "trading card",
    assetName: "Graded card",
    recordType: "holding",
    quantity: 1,
    unit: "pieces",
    buyPrice: 1200,
    priceUnit: "pieces",
    buyDate: daysAgo(120),
    notes: "One graded trading card. Still holding.",
    ...computeReturn(1200, null, "holding"),
  });
  const tsla = await Investment.create({
    owner: alex._id,
    assetClass: "stock",
    assetName: "TSLA",
    recordType: "trade",
    quantity: 8,
    unit: "shares",
    buyPrice: 300,
    sellPrice: 400,
    priceUnit: "shares",
    buyDate: daysAgo(90),
    sellDate: daysAgo(40),
    notes: "Bought at $300, sold at $400. Gross return before fees.",
    ...computeReturn(300, 400, "trade"),
  });
  const silver = await Investment.create({
    owner: alex._id,
    assetClass: "commodity",
    assetName: "Silver",
    recordType: "holding",
    quantity: 5,
    unit: "kg",
    buyPrice: 30,
    priceUnit: "troy oz",
    buyDate: daysAgo(30),
    notes: "5 kg of silver bullion, bought at $30/oz.",
    ...computeReturn(30, null, "holding"),
  });
  await Investment.create({
    owner: alex._id,
    assetClass: "stock",
    assetName: "AAPL",
    recordType: "holding",
    quantity: 12,
    unit: "shares",
    buyPrice: 160,
    priceUnit: "shares",
    buyDate: daysAgo(220),
    notes: "Holding AAPL, bought at $160.",
    ...computeReturn(160, null, "holding"),
  });
  await Investment.create({
    owner: jordan._id,
    assetClass: "commodity",
    assetName: "Gold",
    recordType: "holding",
    quantity: 2,
    unit: "troy oz",
    buyPrice: 2320,
    priceUnit: "troy oz",
    buyDate: daysAgo(60),
    notes: "Small gold position. Chart is an upload, not a feed.",
    ...computeReturn(2320, null, "holding"),
  });
  await Investment.create({
    owner: sam._id,
    assetClass: "collectible",
    category: "coin",
    assetName: "Silver coin",
    recordType: "holding",
    quantity: 1,
    unit: "pieces",
    buyPrice: 85,
    priceUnit: "pieces",
    buyDate: daysAgo(15),
    notes: "One coin, still in the holder.",
    ...computeReturn(85, null, "holding"),
  });

  let receiptUrl: string | null = null;
  let chartUrl: string | null = null;
  try {
    const [receipt, chart] = await Promise.all([saveSvgImage(receiptSvg), saveSvgImage(chartSvg)]);
    receiptUrl = receipt.url;
    chartUrl = chart.url;
    await Proof.create({
      investment: silver._id,
      uploader: alex._id,
      url: receipt.url,
      fileName: "silver-receipt.webp",
      mimeType: receipt.mimeType,
      redactionConfirmed: true,
      label: PROOF_LABEL,
    });
  } catch (error) {
    console.warn("Demo images were skipped", error);
  }

  const alexPost = await Post.create({
    author: alex._id,
    text: "Added 5 kg of silver bullion. The receipt is public proof — user-submitted, not verified — with the dealer details removed.",
    createdAt: daysAgo(2, 5),
  });
  const jordanPost = await Post.create({
    author: jordan._id,
    text: "Here is my annotated gold chart from today. It is a drawing on an upload, not a live price.",
    attachments: chartUrl ? [{ url: chartUrl, kind: "image" }] : [],
    createdAt: daysAgo(1, 6),
  });
  const samPost = await Post.create({
    author: sam._id,
    text: "Graded card prices held up well this quarter. One piece, bought at $1,200, still holding.",
    createdAt: daysAgo(1, 2),
  });
  await Post.create({
    author: jordan._id,
    text: "Was the $30/oz the all-in price, or the spot reference you wrote down?",
    replyTo: alexPost._id,
    createdAt: daysAgo(1, 1),
  });
  alexPost.replyCount = 1;
  await alexPost.save();

  await Like.create({ user: alex._id, post: samPost._id });
  samPost.likeCount = 1;
  await samPost.save();

  const timeline = await Post.create({
    author: sam._id,
    text: "",
    repostOf: alexPost._id,
    createdAt: daysAgo(0, 8),
  });
  await Repost.create({ user: sam._id, post: alexPost._id, timelinePost: timeline._id });
  alexPost.repostCount = 1;
  await alexPost.save();

  const rooms = await Conversation.create([
    {
      type: "topic",
      name: "Stocks & ETFs",
      slug: "stocks-etfs",
      description: "Listed shares and funds.",
      createdBy: admin._id,
      lastMessageAt: daysAgo(3),
      lastMessageText: "Keep trade notes specific, and skip the price targets dressed up as certainty.",
    },
    {
      type: "topic",
      name: "Commodities",
      slug: "commodities",
      description: "Metals, energy, and other physical positions.",
      createdBy: admin._id,
    },
    {
      type: "topic",
      name: "Derivatives",
      slug: "derivatives",
      description: "Options, futures and other types of derivatives.",
      createdBy: admin._id,
      lastMessageAt: daysAgo(4),
      lastMessageText: "Write the strike, expiry, and contract size with every options or futures position.",
    },
    {
      type: "topic",
      name: "Collectibles",
      slug: "collectibles",
      description: "Cards, coins, watches, and anything catalogued by hand.",
      createdBy: admin._id,
      lastMessageAt: daysAgo(2),
      lastMessageText: "Grades and holders belong in the note, not in the price.",
    },
    {
      type: "topic",
      name: "General",
      slug: "general",
      description: "Everything that does not fit a room yet.",
      createdBy: admin._id,
      lastMessageAt: daysAgo(6),
      lastMessageText: "Opinions here are not financial advice.",
    },
  ]);

  const commodities = rooms.find((room: { slug?: string }) => room.slug === "commodities")!;
  const commoditiesMessages = await Message.create([
    {
      conversation: commodities._id,
      author: alex._id,
      text: "Added 5 kg silver bullion, proof uploaded.",
      createdAt: daysAgo(2, 4),
    },
    {
      conversation: commodities._id,
      author: jordan._id,
      text: "Here is my annotated gold chart from today.",
      imageUrl: chartUrl,
      createdAt: daysAgo(1, 5),
    },
    {
      conversation: commodities._id,
      author: sam._id,
      text: "Say the unit. Kg and troy ounces are not the same field.",
      createdAt: daysAgo(0, 3),
    },
  ]);
  commodities.lastMessageAt = commoditiesMessages[2].createdAt;
  commodities.lastMessageText = commoditiesMessages[2].text;
  await commodities.save();

  for (const room of rooms) {
    if (room.slug === "commodities") continue;
    await Message.create({
      conversation: room._id,
      author: admin._id,
      text: room.lastMessageText,
      createdAt: room.lastMessageAt,
    });
  }

  const stackers = await Conversation.create({
    type: "group",
    name: "Stackers",
    createdBy: alex._id,
    members: [
      { user: alex._id, role: "admin" },
      { user: jordan._id, role: "member" },
      { user: sam._id, role: "member" },
    ],
    lastMessageAt: daysAgo(0, 6),
    lastMessageText: "Keeping this group for weights and redacted receipts.",
  });
  await Message.create({
    conversation: stackers._id,
    author: alex._id,
    text: "Keeping this group for weights and redacted receipts.",
    createdAt: daysAgo(0, 6),
  });

  const dm = await Conversation.create({
    type: "dm",
    createdBy: jordan._id,
    members: [
      { user: alex._id, role: "member" },
      { user: jordan._id, role: "member" },
    ],
    lastMessageAt: daysAgo(0, 4),
    lastMessageText: "Yes. The public file only shows the weight and the price.",
  });
  await Message.create([
    {
      conversation: dm._id,
      author: jordan._id,
      text: "Did you redact the dealer name on that silver receipt?",
      createdAt: daysAgo(0, 5),
    },
    {
      conversation: dm._id,
      author: alex._id,
      text: "Yes. The public file only shows the weight and the price.",
      createdAt: daysAgo(0, 4),
    },
  ]);

  const everyone = [admin, alex, jordan, sam];
  for (const person of everyone) {
    await ReadState.insertMany(
      rooms.map((room: { _id: string; slug?: string; lastMessageAt?: Date }) => ({
        user: person._id,
        conversation: room._id,
        lastReadAt: room.slug === "commodities" && String(person._id) === String(alex._id) ? daysAgo(2) : new Date(),
      })),
    );
  }
  await ReadState.create([
    { user: alex._id, conversation: dm._id, lastReadAt: new Date() },
    { user: jordan._id, conversation: dm._id, lastReadAt: daysAgo(0, 5) },
    { user: alex._id, conversation: stackers._id, lastReadAt: new Date() },
    { user: jordan._id, conversation: stackers._id, lastReadAt: new Date() },
    { user: sam._id, conversation: stackers._id, lastReadAt: daysAgo(1) },
  ]);

  await createNotification({
    recipient: alex._id,
    actor: jordan._id,
    type: "follow",
    text: "Jordan Lee followed you",
    link: "/u/jordan",
  });
  await createNotification({
    recipient: alex._id,
    actor: sam._id,
    type: "follow",
    text: "Sam Rivera followed you",
    link: "/u/sam",
  });
  await createNotification({
    recipient: alex._id,
    actor: jordan._id,
    type: "reply",
    text: "Jordan Lee replied to your post",
    link: `/post/${alexPost.id}`,
  });
  await createNotification({
    recipient: sam._id,
    actor: alex._id,
    type: "like",
    text: "Alex Morgan liked your post",
    link: `/post/${samPost.id}`,
  });
  await createNotification({
    recipient: alex._id,
    actor: sam._id,
    type: "repost",
    text: "Sam Rivera reposted your post",
    link: `/post/${alexPost.id}`,
  });
  await createNotification({
    recipient: alex._id,
    actor: sam._id,
    type: "chat",
    text: "Sam Rivera sent a message in Stackers",
    link: `/chat/${stackers.id}`,
  });

  const alexNotes = await Notification.find({ recipient: alex._id }).sort({ createdAt: 1 });
  for (const note of alexNotes.slice(0, -1)) {
    note.read = true;
    await note.save();
  }

  void card;
  void tsla;
  console.log("Seeded demo accounts. Password for all of them: password123");
  console.log("  alex@finazza.dev   Jordan's peer and the portfolio snapshot");
  console.log("  jordan@finazza.dev charts and direct messages");
  console.log("  sam@finazza.dev    collectibles");
  console.log("  admin@finazza.dev  reports and rooms");
}
