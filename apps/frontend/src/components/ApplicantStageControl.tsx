import { AppStatus } from '@api/types';
import {
  Box,
  Button,
  Flex,
  Menu,
  Popover,
  Portal,
  Text,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { BsChevronDown, BsChevronUp } from 'react-icons/bs';
import ConfirmationPopoverContent from './ConfirmationPopoverContent';

const STATUS_CONFIG: Record<
  AppStatus,
  {
    label: string;
    bg: string;
    borderColor: string;
    textColor?: string;
  }
> = {
  [AppStatus.APP_SUBMITTED]: {
    label: 'App Submitted',
    bg: '#FFF9E6',
    borderColor: '#B8AF98',
  },
  [AppStatus.IN_REVIEW]: {
    label: 'In Review',
    bg: '#DBEAFE',
    borderColor: '#74C0E3',
  },
  [AppStatus.FORMS_SIGNED]: {
    label: 'Forms Signed',
    bg: '#E9D5FF',
    borderColor: '#A855F7',
  },
  [AppStatus.ACCEPTED]: {
    label: 'Accepted',
    bg: '#F1F7EC',
    borderColor: '#8BC34A',
  },
  [AppStatus.NO_AVAILABILITY]: {
    label: 'No Availability',
    bg: '#D9D9D9',
    borderColor: '#686868',
    textColor: '#222222',
  },
  [AppStatus.DECLINED]: {
    label: 'Declined',
    bg: '#FFD1D2',
    borderColor: '#E66A6A',
  },
  [AppStatus.ACTIVE]: {
    label: 'Active',
    bg: '#B9F0D0',
    borderColor: '#43B581',
  },
  [AppStatus.INACTIVE]: {
    label: 'Inactive',
    bg: '#F1F5F9',
    borderColor: '#686868',
  },
};

const STATUS_ORDER: AppStatus[] = [
  AppStatus.IN_REVIEW,
  AppStatus.ACCEPTED,
  AppStatus.FORMS_SIGNED,
  AppStatus.ACTIVE,
  AppStatus.DECLINED,
  AppStatus.INACTIVE,
  AppStatus.NO_AVAILABILITY,
  AppStatus.APP_SUBMITTED,
];

interface ApplicantStageControlProps {
  value: AppStatus;
  onConfirmChange: (status: AppStatus) => Promise<void>;
}

const ApplicantStageControl: React.FC<ApplicantStageControlProps> = ({
  value,
  onConfirmChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<AppStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStatus = STATUS_CONFIG[value];
  const pendingStatusConfig = pendingStatus
    ? STATUS_CONFIG[pendingStatus]
    : undefined;

  const orderedStatuses = useMemo(() => {
    return STATUS_ORDER.filter((status) => status !== value);
  }, [value]);

  const triggerBorderRadius =
    isMenuOpen && pendingStatus === null ? '8px 8px 0 0' : '8px';

  const handleStatusSelect = (nextStatus: AppStatus) => {
    setIsMenuOpen(false);

    if (nextStatus === value) {
      setPendingStatus(null);
      return;
    }

    setErrorMessage(null);
    setPendingStatus(nextStatus);
  };

  const handleCancel = () => {
    setPendingStatus(null);
    setIsMenuOpen(false);
  };

  const handleConfirm = async () => {
    if (!pendingStatus) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onConfirmChange(pendingStatus);
      setPendingStatus(null);
      setIsMenuOpen(false);
    } catch {
      setErrorMessage('Failed to update application stage.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Flex direction="column" align={{ base: 'flex-start', lg: 'flex-end' }}>
      <Popover.Root
        open={pendingStatus !== null}
        positioning={{ placement: 'bottom-end' }}
      >
        <Menu.Root
          positioning={{
            placement: 'bottom-end',
            sameWidth: true,
            gutter: 0,
          }}
          open={isMenuOpen}
          onOpenChange={(details) => setIsMenuOpen(details.open)}
        >
          <Popover.Anchor asChild>
            <Box>
              <Menu.Trigger asChild>
                <Button
                  type="button"
                  bg={currentStatus.bg}
                  border={`2px solid ${currentStatus.borderColor}`}
                  borderRadius={triggerBorderRadius}
                  borderBottomWidth={
                    isMenuOpen && pendingStatus === null ? '1px' : '2px'
                  }
                  color="#3A3A3A"
                  fontFamily="Lato, sans-serif"
                  fontSize="16px"
                  fontWeight="500"
                  lineHeight="1"
                  minW={{ base: '148px', md: '168px' }}
                  h={{ base: '38px', md: '40px' }}
                  px={{ base: '12px', md: '16px' }}
                  justifyContent="space-between"
                  _hover={{ bg: currentStatus.bg }}
                  _expanded={{ bg: currentStatus.bg }}
                >
                  <Text>{currentStatus.label}</Text>
                  {isMenuOpen ? (
                    <BsChevronUp fontSize="14px" />
                  ) : (
                    <BsChevronDown fontSize="14px" />
                  )}
                </Button>
              </Menu.Trigger>
            </Box>
          </Popover.Anchor>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                overflow="hidden"
                borderRadius="0 0 12px 12px"
                border="none"
                bg="transparent"
                boxShadow="0 6px 18px rgba(0, 0, 0, 0.12)"
                p="0"
                mt="0"
              >
                {orderedStatuses.map((status) => {
                  const config = STATUS_CONFIG[status];

                  return (
                    <Menu.Item
                      key={status}
                      value={status}
                      onSelect={() => handleStatusSelect(status)}
                      bg={config.bg}
                      boxShadow={`inset 0 0 0 2px ${config.borderColor}`}
                      color={config.textColor ?? '#222222'}
                      fontFamily="Lato, sans-serif"
                      fontSize={{ base: '14px', md: '16px' }}
                      fontWeight={status === value ? '600' : '500'}
                      justifyContent="center"
                      py={{ base: '8px', md: '10px' }}
                      minH="unset"
                      _last={{
                        borderBottomLeftRadius: '12px',
                        borderBottomRightRadius: '12px',
                      }}
                      _highlighted={{
                        bg: config.bg,
                        filter: 'brightness(0.98)',
                      }}
                    >
                      {config.label}
                    </Menu.Item>
                  );
                })}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>

        <ConfirmationPopoverContent
          titleLines={['Confirm Status', 'Change']}
          message={
            pendingStatusConfig
              ? `This will change the stage to ${pendingStatusConfig.label} and may notify the applicant via email.`
              : 'This will notify the applicant via email.'
          }
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmLoading={isSaving}
          cancelDisabled={isSaving}
          errorMessage={errorMessage}
        />
      </Popover.Root>
    </Flex>
  );
};

export default ApplicantStageControl;
