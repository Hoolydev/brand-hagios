import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredAsset = { provider: "s3" | "local"; key: string; url: string };
let s3: S3Client | null = null;

function hasS3Config() {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.S3_PUBLIC_BASE_URL);
}

function getS3() {
  if (!s3) {
    s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "auto",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3;
}

export async function saveAsset(bytes: Buffer, key: string, contentType: string): Promise<StoredAsset> {
  const safeKey = key.replace(/[^a-zA-Z0-9/_\-.]/g, "-");
  if (hasS3Config()) {
    await getS3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: safeKey, Body: bytes, ContentType: contentType }));
    return { provider: "s3", key: safeKey, url: `${process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${safeKey}` };
  }

  const target = path.join(process.cwd(), "public", "generated", safeKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { provider: "local", key: safeKey, url: `/generated/${safeKey}` };
}
