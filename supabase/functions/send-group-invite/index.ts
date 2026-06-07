import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Fix CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    const { email, groupName, inviterName, joinUrl, authUrl, isNewUser } = await req.json();

    console.log(`Attempting to send email to ${email}...`);

    const client = new SmtpClient();
    try {
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 465,
        username: Deno.env.get("SMTP_USER") || "",
        password: Deno.env.get("SMTP_PASS") || "",
      });
      console.log("SMTP Connected successfully.");
    } catch (connectError) {
      console.error("SMTP Connection Error:", connectError);
      throw new Error(`Failed to connect to Gmail SMTP: ${connectError.message}`);
    }

    const loginSection = isNewUser 
      ? `
        You don't have an account on Fairshare yet. 
        Please sign up here: ${authUrl}
        
        IMPORTANT: After you have signed up, please ask the group admin to add you to "${groupName}" again.
      `
      : `
        You can view the group and start tracking expenses by clicking the link below:
        ${joinUrl}
      `;

    try {
      await client.send({
        from: Deno.env.get("SMTP_USER") || "",
        to: email,
        subject: isNewUser ? `Invitation to join Fairshare` : `You've been added to ${groupName} on Fairshare`,
        content: `
          Hello,
          
          ${inviterName} wants to add you to the group "${groupName}" on Fairshare.
          ${loginSection}
          Happy sharing!
          The Fairshare Team
        `,
      });
      console.log("Email sent successfully.");
    } catch (sendError) {
      console.error("Email Send Error:", sendError);
      throw new Error(`Failed to send email: ${sendError.message}`);
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ message: "Email sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
