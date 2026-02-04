#!/bin/bash

echo "=========================================="
echo "🔍 Cloudflare R2 Configuration Diagnostics"
echo "=========================================="
echo ""

# Read .env file
source .env

echo "📋 Current Configuration:"
echo "  Account ID:              $CLOUDFLARE_ACCOUNT_ID"
echo "  R2 Endpoint:             $CLOUDFLARE_R2_ENDPOINT"
echo "  Bucket Name:             $CLOUDFLARE_R2_BUCKET_NAME"
echo "  Access Key ID:           ${CLOUDFLARE_R2_ACCESS_KEY_ID:0:8}..."
echo "  Secret Key Length:       ${#CLOUDFLARE_R2_SECRET_ACCESS_KEY}"
echo ""

echo "📝 Current Test Upload Path Formats:"
echo "  Path-only style:         /transcripts/user/date/file.json"
echo "                           (Requires: transcriptions/* permission)"
echo ""
echo "  Bucket+path style:       /mentra-notes/transcripts/user/date/file.json"
echo "                           (Requires: mentra-notes/* permission)"
echo ""

echo "❓ Troubleshooting Steps:"
echo ""
echo "1. Check token permissions in Cloudflare Dashboard:"
echo "   - Cloudflare Dashboard → R2 → API Tokens"
echo "   - Find your token and verify:"
echo "     a) Permission type: Object Read & Write"
echo "     b) Bucket access: mentra-notes"
echo "     c) Path prefix: Check if scoped to /mentra-notes/*"
echo ""
echo "2. Verify token is still active (not expired)"
echo ""
echo "3. Test with curl:"
echo "   curl -X PUT \\\"
echo "   -H 'Content-Type: application/json' \\\"
echo "   https://3c764e987404b8a1199ce5fdc3544a94.r2.cloudflarestorage.com/test.json"
echo ""

echo "🧪 Available Test Scripts:"
ls -1 /Users/aryan/Documents/Work/TPA/Notes/src/server/test/*.ts 2>/dev/null | xargs -n1 basename | sed 's/^/   - /'

echo ""
echo "=========================================="
