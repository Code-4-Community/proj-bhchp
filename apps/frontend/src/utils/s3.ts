const s3BucketAddrRaw = import.meta.env.VITE_S3_BUCKET_ADDR ?? '';

export function normalizeS3BucketAddr(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
}

export const s3BucketAddr = normalizeS3BucketAddr(s3BucketAddrRaw);

export const toS3Url = (
  filename: string | undefined | null,
  bucketAddr: string = s3BucketAddr,
): string | undefined => {
  if (!filename) {
    return undefined;
  }

  return `${normalizeS3BucketAddr(bucketAddr)}${filename}`;
};
