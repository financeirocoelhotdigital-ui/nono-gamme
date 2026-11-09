import app from "../server";

// Universal serverless handler compatible with Vercel Node runtime
const handler = (req: any, res: any) => {
  return app(req, res);
};

Object.assign(handler, app);

export default handler;
