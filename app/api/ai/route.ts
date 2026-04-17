import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an assistant that generates email reply drafts.

The following email was received by the user who is writing the reply.
The user is replying as the recipient of this email.
Accurately interpret what the sender is asking for and generate an appropriate reply from the recipient's perspective.

You must follow these rules:

1. Return only the JSON schema below. No preamble, postamble, or Markdown code blocks.
{
  "patterns": [
    {
      "label": "pattern name",
      "subject": "subject line",
      "body": "body text"
    }
  ]
}

2. Salutation: If the sender introduces themselves in the body or signature (e.g. "This is [Name]" or "My name is [Name]"), use their name as the salutation at the start of the body (e.g. "Dear [Name],"). Omit if uncertain.
3. Use \\n for all line breaks. Use \\n\\n between paragraphs, \\n for other line breaks.
4. Always return exactly 2–3 patterns.
5. Distinguish each pattern by the direction of the reply, not by tone. Examples: for a request email use "Accept", "Decline", "Pending"; for a question email use "Answer", "Check needed", "Refer"; for a report email use "Acknowledge", "Feedback". The label should be a concise word of 1–3 characters (e.g. "Accept", "Decline", "Pending").
6. Use the original subject prefixed with "Re: " as the default, adjusting as appropriate.`;

type ReplyPattern = {
  label: string;
  subject: string;
  body: string;
};

type ParsedResponse = {
  patterns: ReplyPattern[];
};

function createFallbackPattern(subject: string): ParsedResponse {
  return {
    patterns: [
      {
        label: "Standard Reply",
        subject: subject ? `Re: ${subject}` : "Re: (No subject)",
        body: "Thank you for your email.\n\nWe have received your message and will get back to you after reviewing the details.\n\nBest regards,",
      },
    ],
  };
}

function validateAndFixPatterns(parsed: unknown, subject: string): ParsedResponse {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { patterns?: unknown }).patterns)
  ) {
    return createFallbackPattern(subject);
  }

  const raw = parsed as { patterns: unknown[] };
  const validPatterns = raw.patterns.filter(
    (p): p is ReplyPattern =>
      p !== null &&
      typeof p === "object" &&
      typeof (p as ReplyPattern).label === "string" &&
      typeof (p as ReplyPattern).subject === "string" &&
      typeof (p as ReplyPattern).body === "string" &&
      (p as ReplyPattern).body.trim() !== ""
  );

  if (validPatterns.length === 0) {
    return createFallbackPattern(subject);
  }

  return { patterns: validPatterns };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { emailBody, subject, attachments } = await req.json();

    if (!emailBody) {
      return NextResponse.json(
        { error: "emailBody is required" },
        { status: 400 }
      );
    }

    const contentBlocks: Anthropic.MessageParam["content"] = [];

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.mimeType === "application/pdf" && att.data) {
          const buf = Buffer.from(att.data, "base64");
          if (buf.length > MAX_PDF_BYTES) continue; // スキップ
          contentBlocks.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: att.data,
            },
          } as Anthropic.DocumentBlockParam);
        }
      }
    }

    contentBlocks.push({
      type: "text",
      text: `Subject: ${subject || "(No subject)"}\n\nBody:\n${emailBody}`,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: contentBlocks,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    if (!text) {
      console.error("[ai] Claude returned empty response");
      return NextResponse.json(createFallbackPattern(subject));
    }

    let parsed: unknown;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[ai] JSON parse error:", parseErr, "\nRaw text:", text);
      return NextResponse.json(createFallbackPattern(subject));
    }

    return NextResponse.json(validateAndFixPatterns(parsed, subject));
  } catch (err) {
    console.error("[ai] error:", err);
    return NextResponse.json(createFallbackPattern(""));
  }
}
