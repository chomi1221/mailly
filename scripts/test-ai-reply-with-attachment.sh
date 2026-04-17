#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — fill these in before running
# ---------------------------------------------------------------------------
BASE_URL="http://localhost:3000"
SESSION_COOKIE="next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..oRJgaahxw2FfwZ8J.BCvt2tvbI8kYkdZ07hmqmjsDnwvIcGJSZWQKjg8q3k2cuSewraIu-E7_Fy36WHiJuWwZ2qqsvEYnjd9Fld_CX4vW2P03U8oHXGndO73LorlmrGa_0SmB26c7GXCJCZgTcOEWoz6K6hxsCN-40aNNEqtz2l11kBs0w6-ziQ6h5ZqWHf04COJN_WMw6GYwqDSobDRpw9VKWVZp1IcohHcwIi4KZZxgzoVF8nb9r3btX2sCpZO6xE8psZ5dcdQljrexI7n4TR3gMnEhS6t7oVqqm_FTWKvk3_4_50id7Obne62tnA7srlNi1ket_6WiIE059m31AVpTNVlubybR09nmTCcoyVPGyxWBkHzmjbtd0WWweyTbLeSFvSa5jUyJQbGPclCe2UcTs8-ZgHQAyTHWz0zmVPfwuEzW1n7WGFO4kvkBcqVZpDfznZbLfL8IzqonnslI8Ce2mRYNlNdexe3lCWFBikwEaQv6xvHY2n3uBmzyrs4C6M5AizSaK2qHk3nrhcmsu4ktDdfTLE0hb3gGN0svgMfMp8YuOBBfkoROCrMaUIVmOZiCoyw051QoygJS8bFyzZudqBxTxVALaP2CKIuYzg0dUzXeTPIOEVwtaviFMuvrlYrxIHsNiUcI7lKx6b-JX3uLFG0P4zi5CswIBkKHgw-_82dbHJQDT-BbbTqINvPueSf7f_a3oGEhC1L-9mmrr2mZYpTD072U7qZD9xywoDTaBR8UqXuA2jqimIOPMYvbE3mmH54iaU6VKd0GvkNwY9bq_w.cJQFZinj4m-6V1BRnBXZlw"

MESSAGE_ID="19d872e8e300b5f2"
ATTACHMENT_ID="ANGjdJ92V1FZdlWky7ybfTPNQSgNB78v8HQ27NdljVR8uzWxJqwNgwkfQ92Rpl_05gsboR31N-tg1EqIHuLwURF_BLwV3UelWnMTH-6DrjQwYxfhzHRORhOxiVHt8AQDrnNeRIvCwQTVEnXyeDcjrrIFRk6-h_0aIUSPe_UH3SGonE-_-eT5HCHymCnrY6n4UT-dF-AzqSw-aouHjpHWl6cMZXrGFelA94A6_jULG2dqp7ReTwI7WflGOfHcD7Flobopf41_vuQ23BRsQzN02xp7s8oSOGFVHLj3t3xgO12Snr13mYMLFswiEqNULNs"    # from GET /api/gmail/message/$MESSAGE_ID → .attachments[].attachmentId
ATTACHMENT_MIME="application/pdf"       # or image/png, image/jpeg, etc.
ATTACHMENT_NAME="coverletter_chiyomiakita.pdf"        # filename as reported by the message API
# ---------------------------------------------------------------------------

echo "=== Step 1: Fetch attachment data ==="
attachment_response=$(curl -sf \
  "${BASE_URL}/api/gmail/attachment/${MESSAGE_ID}/${ATTACHMENT_ID}?mimeType=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$ATTACHMENT_MIME")&filename=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$ATTACHMENT_NAME")" \
  -H "Cookie: ${SESSION_COOKIE}")

echo "Attachment response:"
echo "$attachment_response" | jq '{ filename: .filename, mimeType: .mimeType, dataBytes: (.data | length) }'

echo ""
echo "=== Step 2: Extract base64 data ==="
att_data=$(echo "$attachment_response" | jq -r '.data')
att_mime=$(echo "$attachment_response" | jq -r '.mimeType')
att_name=$(echo "$attachment_response" | jq -r '.filename')

echo "Extracted ${#att_data} base64 chars for \"${att_name}\" (${att_mime})"

echo ""
echo "=== Step 3: POST to /api/ai/reply ==="
reply_payload=$(jq -n \
  --arg subject "Test: invoice discussion" \
  --arg from    "sender@example.com" \
  --arg body    "Please review the attached document and let me know your thoughts." \
  --arg data    "$att_data" \
  --arg mime    "$att_mime" \
  --arg fname   "$att_name" \
  '{
    subject: $subject,
    from:    $from,
    body:    $body,
    attachments: [
      { filename: $fname, mimeType: $mime, data: $data }
    ]
  }')

reply_response=$(curl -sf \
  "${BASE_URL}/api/ai/reply" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: ${SESSION_COOKIE}" \
  -d "$reply_payload")

echo ""
echo "=== Step 4: Reply patterns ==="
echo "$reply_response" | jq '.'
