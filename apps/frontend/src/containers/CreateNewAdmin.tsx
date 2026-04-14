import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  chakra,
  Text,
} from '@chakra-ui/react';
import { FaUserPlus } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import NavBar from '@components/NavBar/NavBar';
import { DISCIPLINE_VALUES, UserType } from '@api/types';

const CreateNewAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [discipline, setDiscipline] = useState('');

  const canConfirm = useMemo(() => {
    return (
      email.trim().length > 0 &&
      confirmEmail.trim().length > 0 &&
      email.trim().toLowerCase() === confirmEmail.trim().toLowerCase() &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      discipline.trim().length > 0
    );
  }, [email, confirmEmail, firstName, lastName, discipline]);

  const onCancel = () => {
    navigate('/admin/landing');
  };

  const onConfirm = () => {
    // UI-only for now; backend wiring can be added when endpoint is ready.
    console.debug('[ui] CreateNewAdmin submit', {
      email,
      firstName,
      lastName,
      discipline,
    });
  };

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />

      <Box id="main-content" p="20" flex="1" overflowY="auto" bg="#F3F3F3">
        <Heading size="2xl" mb="6">
          Create Admin
        </Heading>

        <Box
          borderWidth="1px"
          borderRadius="10px"
          bg="#F3F3F3"
          p="8"
          borderColor="black"
        >
          <HStack gap="3" color="#013594" mb="4">
            <FaUserPlus size={40} />
            <Text fontSize="20px" fontWeight="700" color="#5E5E5E">
              Admin Information
            </Text>
          </HStack>

          <Box borderTopWidth="1px" borderColor="#A4A4A4" pt="4" px="4">
            <Flex direction="column" gap="4" maxW="100%">
              <Box>
                <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                  EMAIL
                </Text>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bhchp.org"
                  bg="white"
                  borderColor="#676767"
                  borderRadius="6px"
                  h="40px"
                  fontSize="16px"
                />
              </Box>

              <Box>
                <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                  CONFIRM EMAIL
                </Text>
                <Input
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="admin@bhchp.org"
                  bg="white"
                  borderColor="#676767"
                  borderRadius="6px"
                  h="40px"
                  fontSize="16px"
                />
              </Box>

              <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
                <Box flex="1">
                  <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                    FIRST NAME
                  </Text>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    bg="white"
                    borderColor="#676767"
                    borderRadius="6px"
                    h="40px"
                    fontSize="16px"
                  />
                </Box>

                <Box flex="1">
                  <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                    LAST NAME
                  </Text>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    bg="white"
                    borderColor="#676767"
                    borderRadius="6px"
                    h="40px"
                    fontSize="16px"
                  />
                </Box>
              </Flex>

              <Box>
                <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                  DISCIPLINE
                </Text>
                <chakra.select
                  value={discipline}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setDiscipline(e.target.value)
                  }
                  w="100%"
                  h="40px"
                  borderWidth="1px"
                  borderStyle="solid"
                  borderColor="#676767"
                  borderRadius="6px"
                  bg="white"
                  px="3"
                  fontSize="16px"
                  color={discipline ? '#000000' : '#777777'}
                  _focus={{ boxShadow: 'outline', borderColor: '#4C72C9' }}
                  _hover={{ borderColor: '#4C72C9' }}
                  appearance="none"
                >
                  <option value="">Select discipline</option>
                  {Object.values(DISCIPLINE_VALUES).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </chakra.select>
              </Box>
            </Flex>
          </Box>

          <Flex
            borderTopWidth="1px"
            borderColor="#A4A4A4"
            mt="8"
            pt="6"
            px="6"
            justify="flex-end"
            gap="4"
          >
            <Button
              variant="outline"
              borderColor="#4C72C9"
              color="#013594"
              onClick={onCancel}
              borderRadius="6px"
              p="6"
            >
              Cancel
            </Button>
            <Button
              bg={canConfirm ? '#204AA0' : '#AAB1BE'}
              color="white"
              _hover={canConfirm ? { bg: '#163C86' } : {}}
              onClick={onConfirm}
              disabled={!canConfirm}
              borderRadius="6px"
              p="6"
            >
              Confirm
            </Button>
          </Flex>
        </Box>
      </Box>
    </div>
  );
};

export default CreateNewAdmin;
