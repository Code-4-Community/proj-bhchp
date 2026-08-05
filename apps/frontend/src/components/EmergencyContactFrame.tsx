import { Box, Flex, Text } from '@chakra-ui/react';
import personIcon from '../assets/icons/personIcon.svg?url';

interface EmergencyContactFrameProps {
  name: string;
  phone: string;
  relationship: string;
}

function formatBestEffortPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalizedDigits =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (normalizedDigits.length !== 10) {
    return phone;
  }

  return `${normalizedDigits.slice(0, 3)}-${normalizedDigits.slice(
    3,
    6,
  )}-${normalizedDigits.slice(6)}`;
}

const EmergencyContactFrame = ({
  name,
  phone,
  relationship,
}: EmergencyContactFrameProps) => {
  const formattedPhone = formatBestEffortPhone(phone);

  return (
    <Flex
      align="center"
      gap="26px"
      bg="#F5F5F5"
      borderRadius="md"
      px="20px"
      py="50px"
      w="100%"
    >
      <Flex
        w="100px"
        h="100px"
        borderRadius="200px"
        bg="#013594"
        align="center"
        justify="center"
        flexShrink={0}
        p="29px"
      >
        <img
          src={personIcon}
          alt="Emergency contact avatar"
          style={{
            width: '100%',
            height: '100%',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </Flex>

      <Box
        display="grid"
        gridTemplateColumns="1fr 1fr"
        gridTemplateRows="auto auto auto"
        gap="4px"
        flex={1}
        alignItems="start"
      >
        <Text
          fontSize="20px"
          fontFamily="Lato, sans-serif"
          fontWeight="700"
          color="#000"
          lineHeight="normal"
          gridRow="1"
          gridColumn="1"
        >
          Emergency Contact
        </Text>

        <Flex
          align="center"
          justify="center"
          px="12px"
          py="6px"
          borderRadius="20px"
          border="1px solid #013594"
          bg="#008CA7"
          gridRow="1"
          gridColumn="2"
          alignSelf="center"
          w="fit-content"
        >
          <Text color="white" fontWeight="600" fontSize="sm">
            {relationship}
          </Text>
        </Flex>

        <Text
          fontSize="18px"
          fontFamily="Lato, sans-serif"
          fontWeight="400"
          color="#000"
          gridRow="2"
          gridColumn="1 / span 2"
        >
          {name}
        </Text>

        <Text
          fontSize="18px"
          fontFamily="Lato, sans-serif"
          fontWeight="400"
          color="gray.600"
          gridRow="3"
          gridColumn="1"
        >
          {formattedPhone}
        </Text>
      </Box>
    </Flex>
  );
};

export default EmergencyContactFrame;
