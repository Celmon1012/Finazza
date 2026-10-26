import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

let appPromise: Promise<(req: NextApiRequest, res: NextApiResponse) => void> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = import("../../server/app").then(({ createApp }) => createApp());
  }
  return appPromise;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const app = await getApp();
    app(req, res);
  } catch (error) {
    appPromise = null;
    const message = error instanceof Error ? error.message : "The API failed to start";
    res.status(500).json({ error: message });
  }
}
