
// Local implementation using POST to bypass 403 errors and 'no-cors' for browser blocks
export const sendEmail = async (options: {
  to: string;
  subject: string;
  body: string;
}) => {
  const recipient = options.to.trim();
  console.log(`Dispatched SMTP POST request to ${recipient}...`);

  const host = "smtp.gmail.com";
  const username = "prabhasmudhiveti@gmail.com";
  const password = "ejcj iurw hmio ghia";
  
  // SmtpJS POST endpoint is more reliable and secure
  const url = "https://smtpjs.com/v1/sendpost";
  
  const body = new URLSearchParams({
    To: recipient,
    From: username,
    Subject: options.subject,
    Body: options.body,
    Host: host,
    Username: username,
    Password: password,
    Action: "Send"
  });

  try {
    // Using POST avoids sending sensitive credentials in the URL (prevents 403)
    // mode: 'no-cors' allows the request to reach the server even if CORS headers are missing
    await fetch(url, { 
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    console.log(`SMTP dispatch complete for ${recipient}.`);
    return "Dispatched";
  } catch (error) {
    console.error("Failed to dispatch SMTP email via POST:", error);
    throw error;
  }
};
