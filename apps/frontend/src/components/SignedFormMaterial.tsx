import { Box, Flex, Heading } from '@chakra-ui/react';
import DocumentDownloadCard from './DocumentDownloadCard';
import { toS3Url } from '../utils/s3';

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
