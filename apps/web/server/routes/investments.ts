import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { PROOF_LABEL } from "../config.js";
import { requireAuth } from "../auth.js";
import { HttpError, wrap } from "../http.js";
import { Investment, Proof, User, sameId } from "../models.js";
import { investmentDto } from "../present.js";
import { computeReturn } from "../social.js";
import { deletePublicFile, saveUpload } from "../storage.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const unitPattern = /^[a-zA-Z][a-zA-Z0-9 ./%-]{0,23}$/;

const investmentSchema = z.object({
  assetClass: z.enum(["stock", "etf", "commodity", "collectible", "other"]),
  category: z.string().trim().max(40).nullable().optional(),
  assetName: z.string().trim().min(1).max(80),
  recordType: z.enum(["trade", "holding"]),
  quantity: z.number().positive("Quantity must be greater than zero").max(1e12),
  unit: z.string().trim().regex(unitPattern, "Enter a unit such as shares, kg, troy oz, or pieces"),
  buyPrice: z.number().min(0).max(1e12),
  sellPrice: z.number().min(0).max(1e12).nullable().optional(),
  priceUnit: z.string().trim().regex(unitPattern, "Enter a price unit").optional(),
  buyDate: z.string().min(4),
  sellDate: z.string().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

function parseRecord(body: z.infer<typeof investmentSchema>) {
  const buyDate = new Date(body.buyDate);
  if (Number.isNaN(buyDate.getTime())) throw new HttpError(400, "Enter a valid buy date");
  const priceUnit = body.priceUnit || body.unit;
  if (body.recordType === "holding") {
    return {
      ...body,
      category: body.assetClass === "collectible" ? body.category || "other" : null,
      sellPrice: null,
      sellDate: null,
      priceUnit,
      buyDate,
      notes: body.notes || "",
      ...computeReturn(body.buyPrice, null, "holding"),
    };
  }
  if (body.sellPrice == null) throw new HttpError(400, "A completed trade needs a sell price");
  if (!body.sellDate) throw new HttpError(400, "A completed trade needs a sell date");
  const sellDate = new Date(body.sellDate);
  if (Number.isNaN(sellDate.getTime())) throw new HttpError(400, "Enter a valid sell date");
  if (sellDate < buyDate) throw new HttpError(400, "Sell date cannot be earlier than the buy date");
  return {
    ...body,
    category: body.assetClass === "collectible" ? body.category || "other" : null,
    sellPrice: body.sellPrice,
    sellDate,
    priceUnit,
    buyDate,
    notes: body.notes || "",
    ...computeReturn(body.buyPrice, body.sellPrice, "trade"),
  };
}

async function loadOwned(id: string, userId: unknown) {
  const record = await Investment.findById(id);
  if (!record) throw new HttpError(404, "Investment record not found");
  if (!sameId(record.owner, userId)) throw new HttpError(403, "You can only change your own records");
  return record;
}

router.get(
  "/me",
  wrap(async (req, res) => {
    const records = await Investment.find({ owner: req.user!._id }).sort({ updatedAt: -1 }).populate("owner", "username displayName avatarUrl");
    res.json({ investments: await Promise.all(records.map((record) => investmentDto(record))) });
  }),
);

router.get(
  "/user/:username",
  wrap(async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase(), suspended: false });
    if (!user) throw new HttpError(404, "Profile unavailable");
    if (user.blockedUserIds.some((id) => sameId(id, req.user!._id)) && !sameId(user._id, req.user!._id)) {
      throw new HttpError(404, "Profile unavailable");
    }
    const records = await Investment.find({ owner: user._id }).sort({ createdAt: -1 }).populate("owner", "username displayName avatarUrl");
    res.json({ investments: await Promise.all(records.map((record) => investmentDto(record))) });
  }),
);

router.post(
  "/",
  wrap(async (req, res) => {
    const data = parseRecord(investmentSchema.parse(req.body));
    const record = await Investment.create({ ...data, owner: req.user!._id });
    await record.populate("owner", "username displayName avatarUrl");
    res.status(201).json({ investment: await investmentDto(record) });
  }),
);

router.patch(
  "/:id",
  wrap(async (req, res) => {
    const record = await loadOwned(req.params.id, req.user!._id);
    const data = parseRecord(investmentSchema.parse(req.body));
    Object.assign(record, data);
    await record.save();
    await record.populate("owner", "username displayName avatarUrl");
    res.json({ investment: await investmentDto(record) });
  }),
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    const record = await loadOwned(req.params.id, req.user!._id);
    const proof = await Proof.findOne({ investment: record._id });
    if (proof) {
      await deletePublicFile(proof.url);
      await proof.deleteOne();
    }
    await record.deleteOne();
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/proof",
  upload.single("file"),
  wrap(async (req, res) => {
    const record = await loadOwned(req.params.id, req.user!._id);
    const confirmed = req.body.redactionConfirmed === true || req.body.redactionConfirmed === "true";
    if (!confirmed) {
      throw new HttpError(400, "Confirm that real names, account numbers, and addresses were removed");
    }
    if (!req.file) throw new HttpError(400, "Choose an image or PDF");
    const saved = await saveUpload(req.file.buffer, req.file.mimetype, true);
    const previous = await Proof.findOne({ investment: record._id });
    if (previous) {
      await deletePublicFile(previous.url);
      await previous.deleteOne();
    }
    await Proof.create({
      investment: record._id,
      uploader: req.user!._id,
      url: saved.url,
      fileName: req.file.originalname.slice(0, 120),
      mimeType: saved.mimeType,
      redactionConfirmed: true,
      label: PROOF_LABEL,
    });
    await record.populate("owner", "username displayName avatarUrl");
    res.status(201).json({ investment: await investmentDto(record) });
  }),
);

router.delete(
  "/:id/proof",
  wrap(async (req, res) => {
    const record = await loadOwned(req.params.id, req.user!._id);
    const proof = await Proof.findOne({ investment: record._id });
    if (proof) {
      await deletePublicFile(proof.url);
      await proof.deleteOne();
    }
    await record.populate("owner", "username displayName avatarUrl");
    res.json({ investment: await investmentDto(record) });
  }),
);

export default router;
