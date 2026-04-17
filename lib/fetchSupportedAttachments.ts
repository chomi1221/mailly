import { google } from "googleapis";
import type { Attachment, AttachmentWithData } from "@/types/gmail";

// Fetches base64 data for PDF and image attachments only.
// attachments: Attachment[] from the message API response
// messageId: string
// accessToken: string
// returns: AttachmentWithData[]
export async function fetchSupportedAttachments(
  attachments: Attachment[],
  messageId: string,
  accessToken: string
): Promise<AttachmentWithData[]> {
  const supported = attachments.filter(
    (att) =>
      att.mimeType === "application/pdf" || att.mimeType.startsWith("image/")
  );

  if (supported.length === 0) return [];

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  return Promise.all(
    supported.map(async (att): Promise<AttachmentWithData> => {
      const res = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: att.attachmentId,
      });
      return { ...att, data: res.data.data ?? "" };
    })
  );
}
