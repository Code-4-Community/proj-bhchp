// @vitest-environment jsdom

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import EmergencyContactFrame from './EmergencyContactFrame';

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

describe('EmergencyContactFrame', () => {
  it('formats a plain 10-digit emergency contact phone number for display', () => {
    renderWithChakra(
      <EmergencyContactFrame
        name="Jane Doe"
        phone="1234567890"
        relationship="Mother"
      />,
    );

    expect(screen.getByText('123-456-7890')).toBeTruthy();
  });

  it('falls back to the original value when the phone number is not formatable', () => {
    renderWithChakra(
      <EmergencyContactFrame
        name="Jane Doe"
        phone="ext. 45"
        relationship="Mother"
      />,
    );

    expect(screen.getByText('ext. 45')).toBeTruthy();
  });
});
