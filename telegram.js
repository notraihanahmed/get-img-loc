// api/telegram.js - Vercel Serverless Function (Node)
export const config = { runtime: 'nodejs18.x' };

function dataUrlToBuffer(dataUrl) {
  const m = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if(!m) throw new Error('Invalid data URL');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env' });

  try {
    const body = req.body || {};
    const { consent, kind, image, location } = body;
    if (!consent) return res.status(400).json({ error: 'Consent required' });
    if (!image || !image.dataUrl) return res.status(400).json({ error: 'No image provided' });

    // Convert dataURL to buffer
    const { buffer, mime } = (() => {
      const m = /^data:(.+);base64,(.+)$/.exec(image.dataUrl);
      if(!m) return { buffer: Buffer.from(image.dataUrl, 'base64'), mime: 'image/jpeg' };
      return { buffer: Buffer.from(m[2], 'base64'), mime: m[1] };
    })();

    // Build caption: for first capture include location if provided
    let caption = `Upload (${kind})\nTime: ${image.ts || new Date().toISOString()}`;
    if (location && location.latitude && location.longitude) {
      caption += `\nLocation: ${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)} (±${Math.round(location.accuracy||0)}m)`;
    }

    // Send photo via Telegram sendPhoto
    const form = new (globalThis.FormData)();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('photo', new Blob([buffer], { type: mime }), `photo_${Date.now()}.jpg`);

    const resp = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
    const json = await resp.json();
    if (!json.ok) {
      console.error('telegram error', json);
      return res.status(500).json({ error: 'Telegram API error', detail: json });
    }

    return res.status(200).json({ ok: true, result: json.result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
