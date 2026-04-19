import { describe, expect, it } from 'vitest';

import { normalizeS3BucketAddr, toS3FolderUrl, toS3Url } from './s3';

describe('normalizeS3BucketAddr', () => {
  it('returns an empty string for blank input', () => {
    expect(normalizeS3BucketAddr('   ')).toBe('');
  });

  it('adds https protocol and trailing slash when missing', () => {
    expect(
      normalizeS3BucketAddr('bhchp-bucket.s3.us-east-2.amazonaws.com'),
    ).toBe('https://bhchp-bucket.s3.us-east-2.amazonaws.com/');
  });

  it('keeps existing protocol and appends trailing slash when needed', () => {
    expect(normalizeS3BucketAddr('http://example.com/path')).toBe(
      'http://example.com/path/',
    );
  });

  it('keeps existing trailing slash', () => {
    expect(normalizeS3BucketAddr('https://example.com/path/')).toBe(
      'https://example.com/path/',
    );
  });
});

describe('toS3Url', () => {
  it('builds a normalized absolute URL when given a bucket host', () => {
    expect(
      toS3Url(
        'janedoe_coverLetter_2_6_2026.pdf',
        'bhchp-bucket.s3.us-east-2.amazonaws.com',
      ),
    ).toBe(
      'https://bhchp-bucket.s3.us-east-2.amazonaws.com/janedoe_coverLetter_2_6_2026.pdf',
    );
  });

  it('returns undefined for empty filename values', () => {
    expect(
      toS3Url(undefined, 'https://bhchp-bucket.s3.us-east-2.amazonaws.com'),
    ).toBeUndefined();
    expect(
      toS3Url(null, 'https://bhchp-bucket.s3.us-east-2.amazonaws.com'),
    ).toBeUndefined();
  });
});

describe('toS3FolderUrl', () => {
  it('builds URL using the provided folder prefix', () => {
    expect(
      toS3FolderUrl(
        'janedoe_resume_2_6_2026.pdf',
        'resumes',
        'bhchp-bucket.s3.us-east-2.amazonaws.com',
      ),
    ).toBe(
      'https://bhchp-bucket.s3.us-east-2.amazonaws.com/resumes/janedoe_resume_2_6_2026.pdf',
    );
  });

  it('does not duplicate the folder when filename already includes it', () => {
    expect(
      toS3FolderUrl(
        'cover-letters/janedoe_coverletter_2_6_2026.pdf',
        'cover-letters',
        'bhchp-bucket.s3.us-east-2.amazonaws.com',
      ),
    ).toBe(
      'https://bhchp-bucket.s3.us-east-2.amazonaws.com/cover-letters/janedoe_coverletter_2_6_2026.pdf',
    );
  });

  it('returns undefined for empty filename values', () => {
    expect(
      toS3FolderUrl(
        undefined,
        'syllabus',
        'bhchp-bucket.s3.us-east-2.amazonaws.com',
      ),
    ).toBeUndefined();
    expect(
      toS3FolderUrl(
        null,
        'syllabus',
        'bhchp-bucket.s3.us-east-2.amazonaws.com',
      ),
    ).toBeUndefined();
  });
});
