declare global {
  namespace Express {
    interface Request {
      user?: import("mongoose").HydratedDocument<any>;
    }
  }
}

export {};
