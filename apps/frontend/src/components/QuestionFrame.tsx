import { Box, Button, Flex, Heading, SimpleGrid } from '@chakra-ui/react';

interface QuestionFrameProps {
  question: string;
  answers: string[];
}

export const QuestionFrame: React.FC<{
  frameProps: QuestionFrameProps;
  bgColor?: string;
}> = ({ frameProps, bgColor = 'white' }) => {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} bg={bgColor ?? 'white'}>
      <Flex gap={4} alignItems="center" flexWrap="wrap">
        <Heading as="h2" size="md" flexShrink={0}>
          {frameProps.question}
        </Heading>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={2}>
          {frameProps.answers.map((answer) => (
            <Button
              borderRadius="full"
              px={4}
              py={3}
              minW="auto"
              w="fit-content"
              bg="#008CA7"
              color="white"
              fontFamily="Poppins, sans-serif"
              border="1px solid #013594"
              key={answer}
            >
              {answer}
            </Button>
          ))}
        </SimpleGrid>
      </Flex>
    </Box>
  );
};

export default QuestionFrame;
