import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Popover,
  Spinner,
  Text,
} from '@chakra-ui/react';

import NavBar from '@components/NavBar/NavBar';
import ConfirmationPopoverContent from '@components/ConfirmationPopoverContent';
import StatusPill, { StatusVariant } from '@components/StatusPill';
import apiClient from '@api/apiClient';
import { UserType, type AdminAccountSummary } from '@api/types';

type ToastState = { title: string; description: string } | null;

const ManageAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<AdminAccountSummary[]>([]);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Email of the row whose confirmation popover is open.
  const [openRowEmail, setOpenRowEmail] = useState<string | null>(null);
  const [actionEmail, setActionEmail] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [list, currentUser] = await Promise.all([
        apiClient.listAdmins(),
        apiClient.getCurrentUser(),
      ]);
      const sorted = [...list].sort((a, b) => a.email.localeCompare(b.email));
      setAdmins(sorted);
      setCurrentEmail(currentUser?.email ?? null);
    } catch (error) {
      console.error('[ManageAdmins] failed to load admins', error);
      setLoadError('Failed to load admins. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const onConfirmAction = async (admin: AdminAccountSummary) => {
    setActionEmail(admin.email);
    setActionError(null);
    try {
      if (admin.isActive) {
        await apiClient.deactivateAdmin(admin.email);
        setToast({
          title: 'Admin deactivated',
          description: `${admin.email} can no longer sign in.`,
        });
      } else {
        await apiClient.reactivateAdmin(admin.email);
        setToast({
          title: 'Admin reactivated',
          description: `${admin.email} can sign in again.`,
        });
      }
      setOpenRowEmail(null);
      await loadAdmins();
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      setActionError(
        status === 409
          ? 'You cannot deactivate the last active admin.'
          : 'The action could not be completed. Please try again.',
      );
    } finally {
      setActionEmail(null);
    }
  };

  return (
    <Flex direction="row" h="100vh" overflow="hidden">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />

      <Box id="main-content" p="20" flex="1" overflowY="auto" bg="#F3F3F3">
        {toast && (
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
              <Text fontWeight="700">{toast.title}</Text>
              <Text fontSize="12px">{toast.description}</Text>
            </Box>
          </Box>
        )}

        <Heading size="2xl" mb="6">
          Manage Admins
        </Heading>

        {isLoading && (
          <Flex align="center" gap="3">
            <Spinner size="md" color="#204AA0" />
            <Text>Loading admins...</Text>
          </Flex>
        )}

        {loadError && (
          <Alert.Root status="error" mb="6" mt="4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Unable to load admins</Alert.Title>
              <Alert.Description>{loadError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {!isLoading && !loadError && (
          <Box
            borderWidth="1px"
            borderRadius="10px"
            bg="white"
            borderColor="#A4A4A4"
            overflow="hidden"
          >
            <Flex
              bg="#F3F3F3"
              px="6"
              py="3"
              fontWeight="700"
              fontSize="14px"
              color="#5E5E5E"
              borderBottomWidth="1px"
              borderColor="#A4A4A4"
            >
              <Box flex="2">NAME</Box>
              <Box flex="3">EMAIL</Box>
              <Box flex="1">STATUS</Box>
              <Box flex="1" textAlign="right">
                ACTION
              </Box>
            </Flex>

            {admins.map((admin) => {
              const isSelf = admin.email === currentEmail;
              return (
                <Flex
                  key={admin.email}
                  px="6"
                  py="4"
                  align="center"
                  borderBottomWidth="1px"
                  borderColor="#ECECEC"
                >
                  <Box flex="2">
                    {admin.firstName} {admin.lastName}
                    {isSelf && (
                      <Text as="span" color="#5E5E5E" fontSize="12px" ml="2">
                        (you)
                      </Text>
                    )}
                  </Box>
                  <Box flex="3" color="#5E5E5E">
                    {admin.email}
                  </Box>
                  <Box flex="1">
                    <StatusPill
                      variant={
                        admin.isActive
                          ? StatusVariant.ACTIVE
                          : StatusVariant.INACTIVE
                      }
                    >
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </Box>
                  <Box flex="1" textAlign="right">
                    <Popover.Root
                      open={openRowEmail === admin.email}
                      onOpenChange={(details) => {
                        setOpenRowEmail(details.open ? admin.email : null);
                        setActionError(null);
                      }}
                      positioning={{ placement: 'top' }}
                    >
                      <Popover.Trigger asChild>
                        <Button
                          size="sm"
                          borderRadius="6px"
                          variant={admin.isActive ? 'solid' : 'outline'}
                          bg={admin.isActive ? '#C53030' : undefined}
                          color={admin.isActive ? 'white' : '#013594'}
                          borderColor={admin.isActive ? undefined : '#4C72C9'}
                          _hover={
                            admin.isActive ? { bg: '#9B2C2C' } : undefined
                          }
                        >
                          {admin.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </Popover.Trigger>

                      <ConfirmationPopoverContent
                        variant="compact"
                        titleLines={[
                          admin.isActive
                            ? 'Deactivate admin?'
                            : 'Reactivate admin?',
                        ]}
                        message={
                          admin.isActive
                            ? `${admin.email} will be signed out and blocked from logging in.`
                            : `${admin.email} will be able to log in again.`
                        }
                        confirmText="Yes"
                        cancelText="No"
                        onConfirm={() => onConfirmAction(admin)}
                        onCancel={() => {
                          setOpenRowEmail(null);
                          setActionError(null);
                        }}
                        confirmLoading={actionEmail === admin.email}
                        cancelDisabled={actionEmail === admin.email}
                        errorMessage={
                          openRowEmail === admin.email ? actionError : null
                        }
                      />
                    </Popover.Root>
                  </Box>
                </Flex>
              );
            })}

            {admins.length === 0 && (
              <Box px="6" py="6" color="#5E5E5E">
                No admins found.
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default ManageAdmins;
