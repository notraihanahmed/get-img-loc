// File: api/telegram.js

export const config = { runtime: 'nodejs18.x' };

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const base64 = match[2];
  return Buffer.from(base64, 'base64');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return res.status(500).json({ error: 'Server not configured' });

  try {
    const { consent, session, images, location } = req.body || {};
    if (!consent) return res.status(400).json({ error: 'Consent is required.' });
    if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: 'No images provided.' });

    const locText = location ? `\nLocation: ${location.latitude?.toFixed?.(6)}, ${location.longitude?.toFixed?.(6)} (±${Math.round(location.accuracy||0)}m)` : '';

    for (let i = 0; i < images.length; i++) {
      const { dataUrl, ts } = images[i];
      const buf = dataUrlToBuffer(dataUrl);

      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', `Assignment Upload\nSession: ${session}\nPhoto ${i+1}/${images.length}\nTime: ${ts}${locText}`);
      form.append('photo', new Blob([buf], { type: 'image/jpeg' }), `session${session}_${i+1}.jpg`);

      const resp = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
      const j = await resp.json();
      if (!j.ok) throw new Error(`Telegram error: ${j.description || 'unknown'}`);
    }

    return res.status(200).json({ ok: true, sent: images.length, session });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
