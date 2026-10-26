import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { HttpError } from "./http.js";
import { User } from "./models.js";

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: "7d" });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Sign in required");
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string };
    const user = await User.findById(payload.sub);
    if (!user || user.suspended) throw new HttpError(401, "Sign in required");
    req.user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Sign in required"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    next(new HttpError(403, "Admins only"));
    return;
  }
  next();
}
