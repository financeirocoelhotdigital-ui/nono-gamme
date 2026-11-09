import app from "../server";

// Universal catch-all serverless handler for Vercel
const handler = (req: any, res: any) => {
  try {
    return app(req, res, (err: any) => {
      if (err) {
        console.error("Vercel Serverless Error in /api/[...slug]:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message || "Erro no servidor", status: 500 });
        }
      } else if (!res.headersSent) {
        res.status(404).json({ error: "Endpoint não encontrado", path: req.url });
      }
    });
  } catch (syncErr: any) {
    console.error("Vercel Serverless Synchronous Exception in slug:", syncErr);
    if (!res.headersSent) {
      res.status(500).json({ error: syncErr?.message || "Erro interno de execução", status: 500 });
    }
  }
};

Object.assign(handler, app);

export default handler;
