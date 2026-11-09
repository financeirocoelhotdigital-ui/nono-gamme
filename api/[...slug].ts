import app from "../server";

// Universal catch-all serverless handler for Vercel
const handler = (req: any, res: any) => {
  return app(req, res);
};

Object.assign(handler, app);

export default handler;
