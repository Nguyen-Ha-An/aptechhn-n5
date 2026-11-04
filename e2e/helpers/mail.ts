/**
 * Extracts a 6-digit verification code from email text or HTML content.
 */
export function extractOtpCode(content: string): string | null {
  // 1. Matches codes inside strong tags (e.g. <strong>123456</strong> in magic_link.html)
  const strongMatch = content.match(/<strong>\s*(\d{6})\s*<\/strong>/i);
  if (strongMatch?.[1]) return strongMatch[1];

  // 2. Matches "code: 123456" pattern
  const labeledMatch = content.match(/(?:code|token)[:\s]+(\d{6})\b/i);
  if (labeledMatch?.[1]) return labeledMatch[1];

  // 3. Fallback: any standalone 6-digit sequence
  const generalMatch = content.match(/\b(\d{6})\b/);
  return generalMatch?.[1] ?? null;
}

export interface MailOptions {
  mailHost?: string;
  mailPort?: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Polls the local Supabase mail server (Mailpit or Inbucket fallback)
 * for the latest email sent to the specified address, and extracts the 6-digit OTP code.
 */
export async function getLatestOtpCode(email: string, options: MailOptions = {}): Promise<string> {
  const host = options.mailHost ?? process.env.SUPABASE_MAIL_HOST ?? '127.0.0.1';
  const port = options.mailPort ?? Number(process.env.SUPABASE_MAIL_PORT ?? 54324);
  const timeoutMs = options.timeoutMs ?? 20_000;
  const pollIntervalMs = options.pollIntervalMs ?? 500;

  const startTime = Date.now();
  const baseUrl = `http://${host}:${port}`;

  while (Date.now() - startTime < timeoutMs) {
    // 1. Try Mailpit API (default in modern Supabase CLI)
    try {
      const mailpitRes = await fetch(`${baseUrl}/api/v1/messages`);
      if (mailpitRes.ok) {
        const data = (await mailpitRes.json()) as {
          messages?: Array<{
            ID: string;
            To?: Array<{ Address: string }>;
            Snippet?: string;
          }>;
        };

        const matchingMsg = data.messages?.find((m) =>
          m.To?.some((t) => t.Address.toLowerCase() === email.toLowerCase())
        );

        if (matchingMsg) {
          const detailRes = await fetch(`${baseUrl}/api/v1/message/${matchingMsg.ID}`);
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as {
              Snippet?: string;
              Text?: string;
              HTML?: string;
            };
            const textToSearch = `${detail.HTML ?? ''} ${detail.Text ?? ''} ${detail.Snippet ?? ''}`;
            const code = extractOtpCode(textToSearch);
            if (code) return code;
          } else if (matchingMsg.Snippet) {
            const code = extractOtpCode(matchingMsg.Snippet);
            if (code) return code;
          }
        }
      }
    } catch {
      // Mailpit request failed; try inbucket fallback
    }

    // 2. Try Inbucket API (legacy fallback)
    try {
      const mailboxName = email.split('@')[0] ?? email;
      const inbucketRes = await fetch(`${baseUrl}/api/v1/mailbox/${encodeURIComponent(mailboxName)}`);
      if (inbucketRes.ok) {
        const messages = (await inbucketRes.json()) as Array<{ id: string }>;
        if (messages.length > 0 && messages[0]) {
          const latestId = messages[0].id;
          const msgRes = await fetch(`${baseUrl}/api/v1/mailbox/${encodeURIComponent(mailboxName)}/${latestId}`);
          if (msgRes.ok) {
            const msgData = (await msgRes.json()) as {
              body?: { text?: string; html?: string };
            };
            const textToSearch = `${msgData.body?.html ?? ''} ${msgData.body?.text ?? ''}`;
            const code = extractOtpCode(textToSearch);
            if (code) return code;
          }
        }
      }
    } catch {
      // Both attempts failed this cycle; wait and retry
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Timed out waiting for OTP code email for ${email} from mail server at ${baseUrl}`);
}
