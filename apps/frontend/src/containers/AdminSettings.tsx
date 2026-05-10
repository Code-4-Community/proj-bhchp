import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Fieldset,
  Flex,
  Heading,
  Input,
  Popover,
  Stack,
  Spinner,
  Text,
  For,
} from '@chakra-ui/react';

import NavBar from '@components/NavBar/NavBar';
import ConfirmationPopoverContent from '@components/ConfirmationPopoverContent';
import type { DisciplineCatalogItem, User } from '@api/types';
import { UserType } from '@api/types';
import apiClient from '@api/apiClient';
import { getDisciplineAdminMapCached } from '@utils/disciplineAdminCache';

const normalizeDisciplines = (values: string[]): string[] => {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
    .sort((a, b) => a.localeCompare(b));
};

const areDisciplinesEqual = (left: string[], right: string[]): boolean => {
  const a = normalizeDisciplines(left);
  const b = normalizeDisciplines(right);
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
};

const AdminSettings: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [disciplineCatalog, setDisciplineCatalog] = useState<
    DisciplineCatalogItem[]
  >([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savedFirstName, setSavedFirstName] = useState('');
  const [savedLastName, setSavedLastName] = useState('');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  const [savedDisciplines, setSavedDisciplines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfirmPopoverOpen, setIsConfirmPopoverOpen] = useState(false);

  const activeDisciplineKeys = useMemo(() => {
    return new Set(
      disciplineCatalog.filter((item) => item.isActive).map((item) => item.key),
    );
  }, [disciplineCatalog]);

  const activeSelectedDisciplines = useMemo(() => {
    return selectedDisciplines.filter((key) => activeDisciplineKeys.has(key));
  }, [selectedDisciplines, activeDisciplineKeys]);

  const disciplineOptions = useMemo(() => {
    const activeOptions = disciplineCatalog
      .filter((item) => item.isActive)
      .map((item) => ({
        ...item,
        label: item.label,
      }));

    const inactiveSelectedOptions = selectedDisciplines
      .filter((key) => !activeDisciplineKeys.has(key))
      .map((key) => {
        const matching = disciplineCatalog.find((item) => item.key === key);
        const label = matching?.label ?? key;
        return {
          key,
          label: `${label} (inactive)`,
          isActive: false,
        } as DisciplineCatalogItem;
      });

    return [...activeOptions, ...inactiveSelectedOptions];
  }, [disciplineCatalog, selectedDisciplines, activeDisciplineKeys]);

  const hasChanges = useMemo(() => {
    return !areDisciplinesEqual(selectedDisciplines, savedDisciplines);
  }, [selectedDisciplines, savedDisciplines]);

  const hasNameChanges = useMemo(() => {
    return (
      firstName.trim() !== savedFirstName.trim() ||
      lastName.trim() !== savedLastName.trim()
    );
  }, [firstName, lastName, savedFirstName, savedLastName]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setIsLoading(true);
      setLoadError(null);
      console.debug('[AdminSettings] loadSettings: start');

      try {
        console.debug(
          '[AdminSettings] loadSettings: fetching email + disciplines',
        );
        const [disciplines] = await Promise.all([apiClient.getDisciplines()]);

        console.debug(
          '[AdminSettings] loadSettings: fetching user + admin info',
        );
        const userInfo = await apiClient.getCurrentUser();

        const adminInfo = userInfo?.email
          ? await apiClient.getAdminInfoByEmail(userInfo.email)
          : null;

        console.debug(
          '[AdminSettings] loadSettings: user + admin info loaded',
          {
            hasUser: !!userInfo?.email,
            hasAdminInfo: !!adminInfo,
          },
        );

        if (!userInfo?.email) {
          throw new Error('Missing user info');
        }

        if (!adminInfo) {
          throw new Error('Missing admin info');
        }

        if (mounted) {
          setCurrentUser(userInfo);
          setDisciplineCatalog(disciplines);
          setSelectedDisciplines(adminInfo.disciplines ?? []);
          setSavedDisciplines(adminInfo.disciplines ?? []);
          setFirstName(userInfo.firstName ?? '');
          setLastName(userInfo.lastName ?? '');
          setSavedFirstName(userInfo.firstName ?? '');
          setSavedLastName(userInfo.lastName ?? '');
        }
      } catch (error) {
        console.error('[AdminSettings] loadSettings: failed', error);
        if (mounted) {
          setLoadError('Failed to load settings. Please try again.');
        }
      } finally {
        console.debug('[AdminSettings] loadSettings: done');
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!saveSuccess) return;

    const t = setTimeout(() => setSaveSuccess(false), 3500);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  const onSave = async (): Promise<boolean> => {
    if (!currentUser?.email || isSaving) {
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (hasNameChanges) {
        const updatedUser = await apiClient.updateUserByEmail(
          currentUser.email,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        );
        setCurrentUser(updatedUser);
        setFirstName(updatedUser.firstName ?? '');
        setLastName(updatedUser.lastName ?? '');
        setSavedFirstName(updatedUser.firstName ?? '');
        setSavedLastName(updatedUser.lastName ?? '');
      }

      if (hasChanges) {
        const sanitizedDisciplines = selectedDisciplines.filter((key) =>
          activeDisciplineKeys.has(key),
        );
        const updated = await apiClient.updateAdminDisciplines(
          currentUser.email,
          sanitizedDisciplines,
        );

        setSavedDisciplines(updated.disciplines ?? []);
        setSelectedDisciplines(updated.disciplines ?? []);
      }
      if (hasChanges || hasNameChanges) {
        try {
          await getDisciplineAdminMapCached(undefined, { forceRefresh: true });
        } catch (cacheError) {
          console.debug(
            '[AdminSettings] save: discipline admin map refresh failed',
            cacheError,
          );
        }
      }
      setSaveSuccess(true);
      return true;
    } catch (error) {
      setSaveError('Failed to update settings. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const onCancelChanges = () => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setSelectedDisciplines(savedDisciplines);
    setSaveError(null);
    setSaveSuccess(false);
    setIsConfirmPopoverOpen(false);
  };

  const onConfirmSave = async () => {
    const didSave = await onSave();
    if (didSave) {
      setIsConfirmPopoverOpen(false);
    }
  };

  const onCloseConfirmPopover = () => {
    setIsConfirmPopoverOpen(false);
  };

  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    ((hasChanges && activeSelectedDisciplines.length > 0) || hasNameChanges) &&
    !isSaving &&
    !isLoading;

  return (
    <Flex direction="row" h="100vh" overflow="hidden">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />

      <Box id="main-content" p="20" flex="1" overflowY="auto" bg="#F3F3F3">
        {saveSuccess && (
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
              <Text fontWeight="700">Settings saved</Text>
              <Text fontSize="12px">Your changes have been updated.</Text>
            </Box>
          </Box>
        )}
        <Heading size="2xl" mb="6">
          Settings
        </Heading>

        {isLoading && (
          <Flex align="center" gap="3">
            <Spinner size="md" color="#204AA0" />
            <Text>Loading settings...</Text>
          </Flex>
        )}

        {loadError && (
          <Alert.Root status="error" mb="6" mt="4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Unable to load settings</Alert.Title>
              <Alert.Description>{loadError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {!isLoading && !loadError && (
          <Box
            borderWidth="1px"
            borderRadius="10px"
            bg="#F3F3F3"
            p="8"
            borderColor="black"
          >
            <Text fontSize="20px" fontWeight="700" color="#5E5E5E" mb="4">
              Account Details
            </Text>

            <Box borderTopWidth="1px" borderColor="#A4A4A4" pt="4" px="4">
              <Flex direction="column" gap="4" maxW="100%">
                <Flex gap="4" direction={{ base: 'column', md: 'row' }}>
                  <Box flex="1">
                    <Text
                      fontWeight="700"
                      fontSize="14px"
                      color="#5E5E5E"
                      mb="2"
                    >
                      FIRST NAME
                    </Text>
                    <Input
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setSaveError(null);
                        setSaveSuccess(false);
                      }}
                      bg="white"
                      borderColor="#676767"
                      borderRadius="6px"
                      h="40px"
                      fontSize="16px"
                    />
                  </Box>

                  <Box flex="1">
                    <Text
                      fontWeight="700"
                      fontSize="14px"
                      color="#5E5E5E"
                      mb="2"
                    >
                      LAST NAME
                    </Text>
                    <Input
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setSaveError(null);
                        setSaveSuccess(false);
                      }}
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
                    EMAIL
                  </Text>
                  <Input
                    value={currentUser?.email ?? ''}
                    readOnly
                    bg="#E6E6E6"
                    color="#5E5E5E"
                    cursor="not-allowed"
                    borderColor="#676767"
                    borderRadius="6px"
                    h="40px"
                    fontSize="16px"
                  />
                </Box>

                <Box>
                  <Text fontWeight="700" fontSize="14px" color="#5E5E5E" mb="2">
                    DISCIPLINES
                  </Text>
                  <Box
                    borderWidth="1px"
                    borderStyle="solid"
                    borderColor="#676767"
                    borderRadius="6px"
                    bg="white"
                    px="3"
                    py="3"
                  >
                    <Text fontSize="12px" color="#5E5E5E" mb="2">
                      Select one or more disciplines
                    </Text>
                    <Fieldset.Root>
                      <CheckboxGroup
                        name="admin_disciplines"
                        value={selectedDisciplines}
                        onValueChange={(value) => {
                          setSelectedDisciplines(value);
                          setSaveError(null);
                          setSaveSuccess(false);
                        }}
                      >
                        <Fieldset.Content>
                          <Stack maxH="180px" overflowY="auto" gap="2">
                            <For each={disciplineOptions}>
                              {(value) => (
                                <Checkbox.Root
                                  key={value.key}
                                  value={value.key}
                                >
                                  <Checkbox.HiddenInput />
                                  <Checkbox.Control />
                                  <Checkbox.Label>{value.label}</Checkbox.Label>
                                </Checkbox.Root>
                              )}
                            </For>
                          </Stack>
                        </Fieldset.Content>
                      </CheckboxGroup>
                    </Fieldset.Root>
                  </Box>
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
                borderRadius="6px"
                p="6"
                onClick={onCancelChanges}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Popover.Root
                open={isConfirmPopoverOpen}
                onOpenChange={(details) =>
                  setIsConfirmPopoverOpen(details.open)
                }
                positioning={{ placement: 'top' }}
              >
                <Popover.Trigger asChild>
                  <Button
                    bg={canSave ? '#204AA0' : '#AAB1BE'}
                    color="white"
                    _hover={canSave ? { bg: '#163C86' } : {}}
                    disabled={!canSave || isSaving}
                    borderRadius="6px"
                    p="6"
                  >
                    Confirm
                  </Button>
                </Popover.Trigger>

                <ConfirmationPopoverContent
                  variant="compact"
                  titleLines={['Confirmation']}
                  message="Are you sure you would like to save these changes?"
                  confirmText="Yes"
                  cancelText="No"
                  onConfirm={onConfirmSave}
                  onCancel={onCloseConfirmPopover}
                  confirmLoading={isSaving}
                  cancelDisabled={isSaving}
                  errorMessage={saveError}
                />
              </Popover.Root>
            </Flex>
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default AdminSettings;
