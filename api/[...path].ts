export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(
    JSON.stringify({
      ok: true,
      url: req.url,
      method: req.method,
      env_has_openai: !!process.env.OPENAI_API_KEY,
      node: process.version,
      vercel: !!process.env.VERCEL,
    })
  );
}
