import React from 'react';
import { Box, Flex, Text, Button, Image } from '@chakra-ui/react';

import documentIcon from '../assets/icons/Vector.svg';

export type DocumentDownloadCardVariant = 'resume' | 'coverLetter' | 'syllabus';

const variantStyles: Record<
  DocumentDownloadCardVariant,
  { bg: string; buttonBg: string }
> = {
  resume: {
    bg: 'rgba(0, 140, 167, 0.50)',
    buttonBg: '#008CA7',
  },
  coverLetter: {
    bg: '#6AB242',
    buttonBg: '#48792C',
  },
  syllabus: {
    bg: '#B8AF98',
    buttonBg: '#7f7366',
  },
};

const variantTitles: Record<DocumentDownloadCardVariant, string> = {
  resume: 'Resume',
  coverLetter: 'Cover Letter',
  syllabus: 'Syllabus',
};

export type DocumentDownloadCardProps = {
  variant: DocumentDownloadCardVariant;
  downloadUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Reusable card for viewing and downloading an uploaded document (resume, cover letter, or syllabus).
 */
export default function DocumentDownloadCard({
  variant,
  downloadUrl,
  className,
  style,
}: DocumentDownloadCardProps) {
  const { bg, buttonBg } = variantStyles[variant];
  const title = variantTitles[variant];

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Box
      className={className}
      style={style}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      aspectRatio="1"
      maxW="260px"
      padding="13px 18px"
      gap="40px"
      borderRadius="24px"
      bg={bg}
      flex="0 0 260px"
      minW="0"
      mr={6}
      mb={6}
      fontFamily="Lato, sans-serif"
    >
      <Text
        alignSelf="flex-start"
        color="white"
        fontSize="lg"
        fontWeight="medium"
        mt="2"
        ml="3"
      >
        {title}
      </Text>

      <Flex flex="1" alignItems="center" justifyContent="center">
        <Image
          src={documentIcon}
          alt=""
          width="44px"
          height="56px"
          aria-hidden
        />
      </Flex>

      <Button
        onClick={handleDownload}
        bg={buttonBg}
        color="white"
        borderRadius="full"
        boxShadow="0 4px 4px 0 rgba(0, 0, 0, 0.25)"
        width="100%"
        minW="0"
        py="2"
        px="6"
        mt="-4"
        _hover={{ opacity: 0.9 }}
        cursor={downloadUrl ? 'pointer' : 'not-allowed'}
        disabled={!downloadUrl}
      >
        Download File
      </Button>
    </Box>
  );
}
