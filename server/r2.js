const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

function getR2Client() {
  const accountId = process.env.CF_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 credentials are not fully configured (CF_R2_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY).");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
}

async function uploadToR2(buffer, filename) {
  const bucket = process.env.CF_R2_BUCKET_NAME;
  const publicBase = (process.env.CF_R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!bucket) throw new Error("CF_R2_BUCKET_NAME is not configured.");
  if (!publicBase) throw new Error("CF_R2_PUBLIC_URL is not configured.");

  const client = getR2Client();
  const key = `chess-pdfs/${Date.now()}-${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
    CacheControl: "public, max-age=31536000"
  }));

  return `${publicBase}/${key}`;
}

module.exports = { uploadToR2 };
