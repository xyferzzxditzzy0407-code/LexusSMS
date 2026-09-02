export default async function handler(req, res) {
  try {
    const base = process.env.API_BASE_URL;
    const key = process.env.API_KEY;

    if (!base || !key) {
      return res.status(503).json({
        error: "API environment variables are not configured"
      });
    }

    const url = base.replace(/\/$/, "") + "/api/v1/traffic";

    const r = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json"
      }
    });

    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Provider returned invalid JSON",
        status: r.status,
        response: text.slice(0, 500)
      });
    }

    return res.status(r.status).json(data);

  } catch (e) {
    return res.status(500).json({
      error: "Provider request failed",
      details: e.message
    });
  }
}
