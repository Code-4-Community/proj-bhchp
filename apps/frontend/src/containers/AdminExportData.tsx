import { Box, Button, Flex, Input, Text } from '@chakra-ui/react';
import NavBar from '@components/NavBar/NavBar';
import apiClient from '@api/apiClient';
import { UserType } from '@api/types';
import { useState } from 'react';
import axios from 'axios';

const AdminExportData: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!startDate || !endDate) {
      setError(
        'Failed to export. Please select both created-at dates before exporting.',
      );
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Failed to export. Start date cannot be after end date.');
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      await apiClient.downloadApplicationsCsv(startDate, endDate);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ??
          err.response?.data?.error ??
          'Failed to export applications.';

        setError(message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to export applications.');
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Flex direction="row" h="100vh" overflow="hidden">
      <NavBar logo="BHCHP" userType={UserType.ADMIN} />
      <Box
        id="main-content"
        p="10"
        flex="1"
        display="flex"
        flexDirection="column"
        overflow="auto"
      >
        <Box maxW="760px">
          <Text fontSize="3xl" fontWeight="700" color="#111827" mb="3">
            Export Application Data
          </Text>
          <Text color="gray.600" mb="8">
            Download one CSV row per application for the selected created-at
            date range, including applicant names and learner details used for
            reporting.
          </Text>

          <Box
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="sm"
            p="6"
          >
            <Flex gap="4" wrap="wrap" align={{ base: 'stretch', md: 'end' }}>
              <Box flex="1" minW="220px">
                <Text fontSize="sm" fontWeight="600" mb="2">
                  Created From
                </Text>
                <Input
                  aria-label="export start date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Box>

              <Box flex="1" minW="220px">
                <Text fontSize="sm" fontWeight="600" mb="2">
                  Created To
                </Text>
                <Input
                  aria-label="export end date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Box>

              <Button
                bg="#013594"
                color="white"
                _hover={{ bg: '#102660' }}
                onClick={handleExport}
                loading={isExporting}
                minW="160px"
              >
                Download CSV
              </Button>
            </Flex>

            {error ? (
              <Text color="red.500" mt="4">
                {error}
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

export default AdminExportData;
