export type ReplyPattern = {
  label: string;   // e.g. "丁寧" | "簡潔" | "カジュアル" | "断り"
  subject: string; // 返信件名 (Re: ...)
  body: string;    // 返信本文
};

export type AIReplyResponse = {
  patterns: ReplyPattern[];
};

export type AIReplyAttachment = {
  filename: string;
  mimeType: string; // "application/pdf" or "image/*"
  data: string;     // base64 encoded
};

export type AIReplyRequest = {
  subject: string;
  from: string;
  body: string;
  attachments?: AIReplyAttachment[];
};
