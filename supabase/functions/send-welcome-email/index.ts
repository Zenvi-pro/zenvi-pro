/**
 * Welcome email edge function.
 *
 * Triggered by a database webhook on auth.users INSERT.
 * Uses Resend (resend.com) to send a personalized welcome email.
 *
 * Required env vars:
 *   RESEND_API_KEY   – API key from resend.com
 *   WELCOME_FROM     – (optional) sender, defaults to "Jashan from Zenvi <jashan@zenvi.pro>"
 */

Deno.serve(async (req) => {
  // Only accept POST (webhook payload)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("send-welcome-email: RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const FROM =
    Deno.env.get("WELCOME_FROM") ?? "Jashan from Zenvi <jashan@zenvi.pro>";

  try {
    const payload = await req.json();

    // Database webhook sends { type, table, record, ... }
    const record = payload.record ?? payload;
    const email: string | undefined =
      record.email ?? record.raw_user_meta_data?.email;
    const fullName: string | undefined =
      record.raw_user_meta_data?.full_name ??
      record.raw_user_meta_data?.name ??
      record.raw_user_meta_data?.user_name;

    if (!email) {
      console.warn("send-welcome-email: no email found in payload", payload);
      return new Response(
        JSON.stringify({ skipped: true, reason: "no email" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const firstName = fullName ? fullName.split(" ")[0] : null;
    const greeting = firstName ? `Hi ${firstName},` : "Hey there,";

    const html = buildEmailHtml(greeting, email);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Welcome to Zenvi",
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", res.status, err);
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: err }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    console.log("Welcome email sent:", email, data.id);
    return new Response(JSON.stringify({ sent: true, id: data.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

function buildEmailHtml(greeting: string, _email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="padding:40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td>
              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">${greeting}</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">Thanks for signing up for Zenvi. Seriously, it means a lot.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">We're Jashan and Nilay. Just two people building this, no investors, no big team. We're really excited to have you here.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">We started Zenvi because video editing today is either painfully expensive, painfully slow, or both. Most tools upload your footage to the cloud and treat it like it belongs to them. We think that's broken.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">So we're building a video editor that's fast, private, and actually affordable. Everything runs on your machine. No cloud uploads, no waiting for renders, no subscriptions you need a spreadsheet to track. And we're working toward making it fully open source, because great creative tools shouldn't be locked behind paywalls.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 16px 0;">You're joining while we're still early, which means your voice genuinely shapes what we build next. Found a bug? Have a feature idea? Just reply to this email. It comes straight to us, not a support queue.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0 0 24px 0;">We're glad you're here. Let's make something great together.</p>

              <p style="font-size:15px;color:#1a1a1a;line-height:1.8;margin:0;">Jashan & Nilay</p>
              <p style="font-size:13px;color:#888888;line-height:1.6;margin:4px 0 0 0;">Founders, Zenvi</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
