import { Box, Flex, Heading } from '@chakra-ui/react';
import DocumentDownloadCard from './DocumentDownloadCard';

const s3BucketAddr = import.meta.env.VITE_S3_BUCKET_ADDR ?? '';

const toS3Url = (filename: string | undefined): string | undefined =>
  filename ? `${s3BucketAddr}${filename}` : undefined;

interface UploadedMaterialProps {
  resume: string;
  coverLetter: string;
  syllabus?: string;
}

export const UploadedMaterial: React.FC<{
  frameProps: UploadedMaterialProps;
}> = ({ frameProps }) => {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} bg="white">
      <Heading as="h2" size="md" mb={4}>
        Uploaded Material
      </Heading>

      <Flex gap={4} alignItems="center" flexWrap="wrap">
        <DocumentDownloadCard
          variant="resume"
          downloadUrl={toS3Url(frameProps.resume)}
        />
        <DocumentDownloadCard
          variant="coverLetter"
          downloadUrl={toS3Url(frameProps.coverLetter)}
        />
        {frameProps.syllabus !== undefined && (
          <DocumentDownloadCard
            variant="syllabus"
            downloadUrl={toS3Url(frameProps.syllabus)}
          />
        )}
      </Flex>
    </Box>
  );
};

export default UploadedMaterial;
