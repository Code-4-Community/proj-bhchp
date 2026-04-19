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

  const normalizedBucketAddr = normalizeS3BucketAddr(bucketAddr);

  if (!normalizedBucketAddr) {
    return undefined;
  }

  return `${normalizedBucketAddr}${filename}`;
};

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

export const toS3FolderUrl = (
  filename: string | undefined | null,
  folder: string,
  bucketAddr: string = s3BucketAddr,
): string | undefined => {
  if (!filename) {
    return undefined;
  }

  const normalizedFolder = trimSlashes(folder);
  const normalizedFilename = filename.replace(/^\/+/, '');
  const key = normalizedFilename.startsWith(`${normalizedFolder}/`)
    ? normalizedFilename
    : `${normalizedFolder}/${normalizedFilename}`;

  return toS3Url(key, bucketAddr);
};
