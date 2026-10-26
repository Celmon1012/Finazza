import type { NextApiRequest, NextApiResponse } from "next";
import { createApp } from "../../../api/src/app";

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const app = createApp();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  app(req, res);
}
