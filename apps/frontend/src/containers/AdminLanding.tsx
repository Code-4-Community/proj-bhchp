import DashboardCard from '@components/DashboardCard';
import NavBar from '@components/NavBar/NavBar';
import FilterPopUp from '@components/FilterPopUp';

import usersIcon from '../assets/icons/users.svg';
import clockIcon from '../assets/icons/clock.svg';
import crossIcon from '../assets/icons/cross.svg';
import checkmarkIcon from '../assets/icons/checkmark.svg';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { useState } from 'react';
import PageTransitionButton from '@components/PageTransitionButton';
import Searchbar from '@components/TableSearchBar';
import PageCounter from '@components/PageCounter';
import ApplicationTable from '@components/ApplicationTable';
import { UserType } from '@api/types';
import {
  useApprovedApplicationsCount,
  useInReviewApplicationsCount,
  useRejectedApplicationsCount,
  useTotalApplicationsCount,
} from '@api/apiClient';
import { useApplications } from '@hooks/useApplications';
import {
  EMPTY_APPLICATION_FILTERS,
  type ApplicationFilters,
} from '@utils/applicationFilters';

const AdminLanding: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [applicationFilters, setApplicationFilters] =
    useState<ApplicationFilters>(EMPTY_APPLICATION_FILTERS);
  const { count: totalCount } = useTotalApplicationsCount();
  const { count: inReviewCount } = useInReviewApplicationsCount();
  const { count: rejectedCount } = useRejectedApplicationsCount();
  const { count: approvedCount } = useApprovedApplicationsCount();
  const { applications, loading, error } = useApplications();

  const disciplineAdminOptions = Array.from(
    new Set(
      applications
        .map((application) => application.disciplineAdminName)
        .filter((name) => Boolean(name?.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  function onResetFilters() {
    setApplicationFilters(EMPTY_APPLICATION_FILTERS);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
  }

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <NavBar logo={'BHCHP'} userType={UserType.ADMIN} />
      <Box
        id="main-content"
        p="10"
        flex="1"
        display="flex"
        flexDirection="column"
        overflow="auto"
      >
        <Box className="flex flex-row gap-6 pl-4 pt-4">
          <DashboardCard
            className="basis-1/4"
            title="Total Applications"
            value={totalCount}
            description="All time submissions"
            icon={usersIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Pending Review"
            value={inReviewCount}
            description="Awaiting decision"
            icon={clockIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Rejected"
            value={rejectedCount}
            description="Not matched"
            icon={crossIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Approved"
            value={approvedCount}
            description="Active volunteers"
            icon={checkmarkIcon}
          />
        </Box>
        <div
          style={{
            marginTop: '20px',
            marginBottom: '20px',
            fontFamily: 'Lato, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            lineHeight: '100%',
            color: '#000000',
          }}
        >
          <p>Recent Applications</p>
        </div>

        <Flex gap="3" align="center" mb="5">
          <Box flex="1">
            <Searchbar value={searchQuery} onChange={onChange}></Searchbar>
          </Box>
          <FilterPopUp
            open={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            filters={applicationFilters}
            onFiltersChange={setApplicationFilters}
            onResetFilters={onResetFilters}
            disciplineAdminOptions={disciplineAdminOptions}
          />
        </Flex>

        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginTop: '20px',
            overflowX: 'auto',
            paddingRight: isFilterOpen ? '340px' : '0',
            transition: 'padding-right 0.2s ease',
          }}
        >
          {loading && <Spinner size="xl" alignSelf="center" mt="10" />}
          {error && <Text color="red.500">{error}</Text>}
          {!loading && !error && (
            <ApplicationTable
              applications={applications}
              searchQuery={searchQuery}
              filters={applicationFilters}
            />
          )}
        </Box>

        <Flex justify="space-between" align="center" mt="4" mb="4">
          <PageTransitionButton
            buttonType="previous"
            onClick={() => setPage(page - 1)}
          />
          <PageCounter page={page} setPage={setPage} maxPages={1} />
          <PageTransitionButton
            buttonType="next"
            onClick={() => setPage(page + 1)}
          />
        </Flex>
      </Box>
    </div>
  );
};

export default AdminLanding;
