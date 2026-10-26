import { config } from "./config.js";

export async function sendPasswordReset(email: string, resetUrl: string) {
  if (!config.resendApiKey) {
    console.log(`Password reset for ${email}: ${resetUrl}`);
    return { delivered: false as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: email,
      subject: "Reset your FINAZZA password",
      text: `Reset your password: ${resetUrl}\n\nThis link expires in one hour. If you did not ask for it, you can ignore this email.`,
    }),
  });

  if (!response.ok) {
    console.error("Resend error", await response.text());
    throw new Error("Email could not be sent");
  }
  return { delivered: true as const };
}
