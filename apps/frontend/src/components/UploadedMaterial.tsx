import { Box, Flex, Heading } from '@chakra-ui/react';
import DocumentDownloadCard from './DocumentDownloadCard';

interface UploadedMaterialProps {
  hasSyllabus: boolean;
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
        <DocumentDownloadCard variant="resume" />
        <DocumentDownloadCard variant="coverLetter" />
        {frameProps.hasSyllabus && <DocumentDownloadCard variant="syllabus" />}
      </Flex>
    </Box>
  );
};

export default UploadedMaterial;
