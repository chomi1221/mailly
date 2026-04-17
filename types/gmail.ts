export type Email = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labelIds: string[];
  isUnread: boolean;
};

export type Attachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type AttachmentWithData = Attachment & {
  data: string; // base64-encoded binary content
};

export type MessageDetail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  snippet: string;
  textPlain: string;
  textHtml: string;
  attachments: Attachment[];
  labelIds: string[];
  messageId: string;
  references: string;
};
