import { Button } from '@chakra-ui/react';

type StatusPillProps = {
  variant:
    | 'submitted'
    | 'review'
    | 'formsSent'
    | 'accepted'
    | 'declined'
    | 'noAvailability'
    | 'active'
    | 'inactive';
  children: React.ReactNode;
};

const variantStyles = {
  submitted: {
    background: '#FFF9E6',
    border: '#B8AF98',
  },
  review: {
    background: '#DBEAFE',
    border: '#2563EB',
  },
  formsSent: {
    background: '#E9D5FF',
    border: '#9333EA',
  },
  accepted: {
    background: '#F1F7EC',
    border: '#6AB242',
  },
  declined: {
    background: '#FFD1D2',
    border: '#E91E21',
  },
  noAvailability: {
    background: '#0000004D',
    border: '#000000',
  },
  active: {
    background: '#A7F3D0',
    border: '#047857',
  },
  inactive: {
    background: '#F1F5F9',
    border: '#686868',
  },
};

export default function StatusPill({ variant, children }: StatusPillProps) {
  const style = variantStyles[variant];

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
