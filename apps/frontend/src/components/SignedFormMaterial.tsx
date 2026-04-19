import { Box, Flex, Heading } from '@chakra-ui/react';
import DocumentDownloadCard from './DocumentDownloadCard';

const s3BucketAddrRaw = import.meta.env.VITE_S3_BUCKET_ADDR ?? '';

function normalizeS3BucketAddr(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith('/') ? withProtocol : `${withProtocol}/`;
}

const s3BucketAddr = normalizeS3BucketAddr(s3BucketAddrRaw);

const toS3Url = (filename: string | undefined): string | undefined =>
  filename && s3BucketAddr ? `${s3BucketAddr}${filename}` : undefined;

interface SignedFormMaterialProps {
  signedForm?: string;
}

export const SignedFormMaterial: React.FC<{
  frameProps: SignedFormMaterialProps;
}> = ({ frameProps }) => {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
      <Heading as="h2" size="md" mb={4}>
        Confidentiality Forms
      </Heading>

      <Flex gap={4} alignItems="center" flexWrap="wrap">
        <DocumentDownloadCard
          variant="signedForm"
          downloadUrl={toS3Url(frameProps.signedForm)}
        />
      </Flex>
    </Box>
  );
};

export default SignedFormMaterial;
