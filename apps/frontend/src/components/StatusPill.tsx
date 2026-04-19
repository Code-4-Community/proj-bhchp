import { Button } from '@chakra-ui/react';

export enum StatusVariant {
  APP_SUBMITTED = 'App Submitted',
  IN_REVIEW = 'In Review',
  FORMS_SIGNED = 'Forms Signed',
  ACCEPTED = 'Accepted',
  DECLINED = 'Declined',
  NO_AVAILABILITY = 'No Availability',
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

type StatusPillProps = {
  variant: StatusVariant;
  children: React.ReactNode;
};

export const StatusPillConfig: Record<
  StatusVariant,
  { label: string; background: string; border: string }
> = {
  [StatusVariant.APP_SUBMITTED]: {
    label: 'Submitted',
    background: '#FFF9E6',
    border: '#B8AF98',
  },
  [StatusVariant.IN_REVIEW]: {
    label: 'Review',
    background: '#DBEAFE',
    border: '#2563EB',
  },
  [StatusVariant.FORMS_SIGNED]: {
    label: 'Forms Signed',
    background: '#E9D5FF',
    border: '#9333EA',
  },
  [StatusVariant.ACCEPTED]: {
    label: 'Accepted',
    background: '#F1F7EC',
    border: '#6AB242',
  },
  [StatusVariant.DECLINED]: {
    label: 'Declined',
    background: '#FFD1D2',
    border: '#E91E21',
  },
  [StatusVariant.NO_AVAILABILITY]: {
    label: 'No Availability',
    background: '#0000004D',
    border: '#000000',
  },
  [StatusVariant.ACTIVE]: {
    label: 'Active',
    background: '#A7F3D0',
    border: '#047857',
  },
  [StatusVariant.INACTIVE]: {
    label: 'Inactive',
    background: '#F1F5F9',
    border: '#686868',
  },
};

export default function StatusPill({ variant, children }: StatusPillProps) {
  const style = StatusPillConfig[variant];

  return (
    <Button
      display="inline-flex"
      px="12px"
      py="5px"
      justifyContent="center"
      alignItems="center"
      gap="6px"
      borderRadius="36px"
      border={`1px solid ${style.border}`}
      bg={style.background}
      fontWeight="normal"
      height="28px"
      color="black"
    >
      {children}
    </Button>
  );
}
