import { Box, Button, Flex, Popover, Portal, Text } from '@chakra-ui/react';

type ConfirmationPopoverVariant = 'default' | 'compact';

interface ConfirmationPopoverContentProps {
  titleLines: string[];
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
  cancelDisabled?: boolean;
  errorMessage?: string | null;
  variant?: ConfirmationPopoverVariant;
}

const STYLES = {
  default: {
    width: '470px',
    borderRadius: '12px',
    borderColor: '#686868',
    padding: { base: '24px', md: '32px' },
    iconSize: '56px',
    iconFontSize: '28px',
    iconMarginBottom: '18px',
    titleFontSize: { base: '30px', md: '38px' },
    titleMarginBottom: '16px',
    messageFontSize: '16px',
    messageMarginBottom: '24px',
    buttonGap: '16px',
    buttonMinWidth: '140px',
    buttonRadius: '12px',
  },
  compact: {
    width: '340px',
    borderRadius: '10px',
    borderColor: '#676767',
    padding: '24px',
    iconSize: '36px',
    iconFontSize: '18px',
    iconMarginBottom: '12px',
    titleFontSize: '22px',
    titleMarginBottom: '8px',
    messageFontSize: '14px',
    messageMarginBottom: '16px',
    buttonGap: '16px',
    buttonMinWidth: '100px',
    buttonRadius: '6px',
  },
} as const;

const ConfirmationPopoverContent: React.FC<ConfirmationPopoverContentProps> = ({
  titleLines,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmLoading = false,
  cancelDisabled = false,
  errorMessage,
  variant = 'default',
}) => {
  const styles = STYLES[variant];

  return (
    <Portal>
      <Popover.Positioner>
        <Popover.Content
          width={styles.width}
          maxW="calc(100vw - 32px)"
          borderRadius={styles.borderRadius}
          border={`1px solid ${styles.borderColor}`}
          boxShadow="0 10px 30px rgba(0, 0, 0, 0.18)"
          p={styles.padding}
        >
          <Popover.Arrow />
          <Popover.Body p="0">
            <Flex direction="column" align="center" textAlign="center">
              <Box
                width={styles.iconSize}
                height={styles.iconSize}
                borderRadius="full"
                bg="#E7EEFF"
                color="#4C6EDB"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={styles.iconFontSize}
                mb={styles.iconMarginBottom}
              >
                !
              </Box>

              {titleLines.map((titleLine, index) => {
                const isLastLine = index === titleLines.length - 1;

                return (
                  <Text
                    key={`${titleLine}-${index}`}
                    fontFamily="Lato, sans-serif"
                    fontSize={styles.titleFontSize}
                    fontWeight="700"
                    lineHeight="1.1"
                    color="#000000"
                    mb={isLastLine ? styles.titleMarginBottom : '0'}
                  >
                    {titleLine}
                  </Text>
                );
              })}

              <Text
                fontFamily="Lato, sans-serif"
                fontSize={styles.messageFontSize}
                color="#2D2D2D"
                mb={styles.messageMarginBottom}
              >
                {message}
              </Text>

              <Flex gap={styles.buttonGap} wrap="wrap" justify="center">
                <Button
                  bg="#013594"
                  color="white"
                  minW={styles.buttonMinWidth}
                  borderRadius={styles.buttonRadius}
                  onClick={onConfirm}
                  loading={confirmLoading}
                  _hover={{ bg: '#012A74' }}
                >
                  {confirmText}
                </Button>
                <Button
                  variant="outline"
                  borderColor={styles.borderColor}
                  minW={styles.buttonMinWidth}
                  borderRadius={styles.buttonRadius}
                  onClick={onCancel}
                  disabled={cancelDisabled}
                >
                  {cancelText}
                </Button>
              </Flex>

              {errorMessage && (
                <Text mt="16px" color="red.500" fontSize="sm">
                  {errorMessage}
                </Text>
              )}
            </Flex>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  );
};

export default ConfirmationPopoverContent;
