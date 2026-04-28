import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  Heading,
  IconButton,
  Menu,
  Textarea,
  Portal,
} from '@chakra-ui/react';
import { BsThreeDots } from 'react-icons/bs';
import { AvailabilityFields } from '@api/types';
import apiClient from '@api/apiClient';

type DayKey = keyof AvailabilityFields;

const DAYS: { label: string; key: DayKey }[] = [
  { label: 'Monday', key: 'mondayAvailability' },
  { label: 'Tuesday', key: 'tuesdayAvailability' },
  { label: 'Wednesday', key: 'wednesdayAvailability' },
  { label: 'Thursday', key: 'thursdayAvailability' },
  { label: 'Friday', key: 'fridayAvailability' },
  { label: 'Saturday', key: 'saturdayAvailability' },
];

interface AvailabilityTableProps {
  appId: number;
  availability: AvailabilityFields;
  isAdmin: boolean;
  onUpdate?: (updated: AvailabilityFields) => void;
}

export const AvailabilityTable: React.FC<AvailabilityTableProps> = ({
  appId,
  availability,
  isAdmin,
  onUpdate,
}) => {
  const [editingDay, setEditingDay] = useState<DayKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEditOpen = (dayKey: DayKey) => {
    setEditValue(availability[dayKey] ?? '');
    setEditingDay(dayKey);
  };

  const handleEditClose = () => {
    setEditingDay(null);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!editingDay) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateAvailability(appId, {
        [editingDay]: editValue,
      });
      onUpdate?.({
        mondayAvailability: updated.mondayAvailability,
        tuesdayAvailability: updated.tuesdayAvailability,
        wednesdayAvailability: updated.wednesdayAvailability,
        thursdayAvailability: updated.thursdayAvailability,
        fridayAvailability: updated.fridayAvailability,
        saturdayAvailability: updated.saturdayAvailability,
      });
      handleEditClose();
    } catch (err) {
      console.error('Failed to update availability:', err);
    } finally {
      setSaving(false);
    }
  };

  const editingDayLabel = DAYS.find((d) => d.key === editingDay)?.label ?? '';

  return (
    <Box>
      <Heading size="md" mb="4" fontWeight="bold">
        Availability
      </Heading>

      <Box
        borderRadius="lg"
        overflow="hidden"
        border="1px solid"
        borderColor="gray.200"
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          backgroundColor="#013594"
          color="white"
          fontWeight="semibold"
          fontSize="sm"
          px="6"
          py="3"
        >
          <Box width="180px" flexShrink={0}>
            Day
          </Box>
          <Box flex="1">Times Available</Box>
          {isAdmin && <Box width="48px" />}
        </Box>

        {/* Rows */}
        {DAYS.map(({ label, key }, index) => (
          <Box
            key={key}
            display="flex"
            alignItems="center"
            px="6"
            py="4"
            bg={index % 2 === 0 ? 'gray.50' : 'white'}
            borderTop={index === 0 ? 'none' : '1px solid'}
            borderColor="gray.100"
            _hover={{ bg: 'gray.50' }}
          >
            <Box width="180px" flexShrink={0} fontWeight="medium">
              {label}
            </Box>
            <Box flex="1" color="gray.700">
              {availability[key] || '—'}
            </Box>
            {isAdmin && (
              <Box width="48px" textAlign="right">
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <IconButton
                      aria-label={`Edit ${label} availability`}
                      variant="ghost"
                      size="sm"
                      color="gray.600"
                    >
                      <BsThreeDots />
                    </IconButton>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content minW="120px">
                        <Menu.Item
                          value="edit"
                          onSelect={() => handleEditOpen(key)}
                        >
                          Edit
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Dialog.Root
        open={editingDay !== null}
        onOpenChange={(details) => {
          if (!details.open) handleEditClose();
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="lg">
              <Dialog.Header>
                <Dialog.Title>Edit {editingDayLabel} Availability</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter availability (e.g. 9am-12pm, every other week)"
                  rows={3}
                  autoFocus
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={handleEditClose}>
                  Cancel
                </Button>
                <Button
                  colorPalette="blue"
                  onClick={handleSave}
                  loading={saving}
                  ml="3"
                >
                  Save
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};

export default AvailabilityTable;
