// Cloudflare Pages Function — handles POST /api/contact
// Sends the contact form submission to info@mdgeniusai.com via Mailgun.
// Your Mailgun API key is stored as an environment variable (MAILGUN_API_KEY),
// never exposed to the browser.

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // Basic validation
    if (!data.name || !data.phone || !data.email) {
      return new Response("Missing required fields", { status: 400 });
    }

    const consent = data.smsConsent === "yes" ? "YES — opted in" : "No";

    const body =
      `New information request from MDGenius AI website\n\n` +
      `Name: ${data.name}\n` +
      `Phone: ${data.phone}\n` +
      `Email: ${data.email}\n` +
      `Interested in: ${data.interest || "(not specified)"}\n` +
      `Message: ${data.message || "(none)"}\n\n` +
      `SMS consent: ${consent}\n` +
      `Submitted: ${new Date().toISOString()}\n`;

    // Mailgun config from environment variables
    const MAILGUN_DOMAIN = env.MAILGUN_DOMAIN;     // e.g. mg.mdgeniusai.com
    const MAILGUN_API_KEY = env.MAILGUN_API_KEY;   // secret
    const TO = env.CONTACT_TO || "info@mdgeniusai.com";
    const FROM = env.CONTACT_FROM || `MDGenius AI Website <noreply@${MAILGUN_DOMAIN}>`;

    const params = new URLSearchParams();
    params.append("from", FROM);
    params.append("to", TO);
    params.append("h:Reply-To", data.email);
    params.append("subject", `New website inquiry — ${data.name}`);
    params.append("text", body);

    const resp = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`api:${MAILGUN_API_KEY}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!resp.ok) {
      const t = await resp.text();
      return new Response("Email send failed: " + t, { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Server error: " + err.message, { status: 500 });
  }
}
