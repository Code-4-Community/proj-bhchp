import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Popover,
  chakra,
  Text,
} from '@chakra-ui/react';
import { FaUserPlus } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import NavBar from '@components/NavBar/NavBar';
import ConfirmationPopoverContent from '@components/ConfirmationPopoverContent';
import { DISCIPLINE_VALUES, UserType } from '@api/types';
import apiClient from '@api/apiClient';

const CreateNewAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [isConfirmPopoverOpen, setIsConfirmPopoverOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resetForm = () => {
    setEmail('');
    setConfirmEmail('');
    setFirstName('');
    setLastName('');
    setDiscipline('');
  };

  const onConfirm = async () => {
    if (!canConfirm || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.debug('[ui] CreateNewAdmin submit', {
        email,
        firstName,
        lastName,
        discipline,
      });

      const response = await apiClient.provisionAdmin({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        discipline: discipline as DISCIPLINE_VALUES,
      });

      if (response.status !== 'SUCCESS') {
        console.error(
          '[ui] CreateNewAdmin provisioning returned non-success response',
          response,
        );
        setSubmitError(
          'We could not finish creating this admin account. Please try again or contact support.',
        );
        return;
      }

      setIsConfirmPopoverOpen(false);
      setShowSuccess(true);
      resetForm();
    } catch (error) {
      console.error('[ui] CreateNewAdmin provisioning failed', error);
      setSubmitError(
        'We could not finish creating this admin account. Please try again or contact support.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showSuccess) return;

    const t = setTimeout(() => setShowSuccess(false), 4500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const onCloseConfirmPopover = () => {
    setIsConfirmPopoverOpen(false);
  };

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />

      <Box id="main-content" p="20" flex="1" overflowY="auto" bg="#F3F3F3">
        {showSuccess && (
          <Box
            position="fixed"
            top="20px"
            right="20px"
            zIndex={9999}
            bg="white"
            border="1px solid rgba(0,0,0,0.08)"
            boxShadow="0 6px 18px rgba(0,0,0,0.12)"
            borderRadius="8px"
            px="16px"
            py="10px"
            display="flex"
            alignItems="center"
            gap="12px"
          >
            <Box
              width="28px"
              height="28px"
              borderRadius="full"
              bg="#E7EEFF"
              color="#4C6EDB"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="14px"
            >
              !
            </Box>
            <Box>
              <Text fontWeight="700">Admin submitted</Text>
              <Text fontSize="12px">
                You have successfully submitted a new admin.
              </Text>
            </Box>
          </Box>
        )}
        <Heading size="2xl" mb="6">
          Create Admin
        </Heading>

        {submitError && (
          <Alert.Root status="error" mb="6">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Admin creation failed</Alert.Title>
              <Alert.Description>{submitError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSubmitError(null);
                  }}
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
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    setSubmitError(null);
                  }}
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
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setSubmitError(null);
                    }}
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
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setSubmitError(null);
                    }}
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
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setDiscipline(e.target.value);
                    setSubmitError(null);
                  }}
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
              disabled={isSubmitting}
              borderRadius="6px"
              p="6"
            >
              Cancel
            </Button>
            <Popover.Root
              open={isConfirmPopoverOpen}
              onOpenChange={(details) => setIsConfirmPopoverOpen(details.open)}
              positioning={{ placement: 'top' }}
            >
              <Popover.Trigger asChild>
                <Button
                  bg={canConfirm ? '#204AA0' : '#AAB1BE'}
                  color="white"
                  _hover={canConfirm ? { bg: '#163C86' } : {}}
                  disabled={!canConfirm || isSubmitting}
                  borderRadius="6px"
                  p="6"
                >
                  Confirm
                </Button>
              </Popover.Trigger>

              <ConfirmationPopoverContent
                variant="compact"
                titleLines={['Confirmation']}
                message="Are you sure you would like to submit?"
                confirmText="Yes"
                cancelText="No"
                onConfirm={onConfirm}
                onCancel={onCloseConfirmPopover}
                confirmLoading={isSubmitting}
                cancelDisabled={isSubmitting}
                errorMessage={submitError}
              />
            </Popover.Root>
          </Flex>
        </Box>
      </Box>
    </div>
  );
};

export default CreateNewAdmin;
