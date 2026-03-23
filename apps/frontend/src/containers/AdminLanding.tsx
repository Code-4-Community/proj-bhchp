import DashboardCard from '@components/DashboardCard';
import NavBar from '@components/NavBar/NavBar';

import usersIcon from '../assets/icons/users.svg';
import clockIcon from '../assets/icons/clock.svg';
import crossIcon from '../assets/icons/cross.svg';
import checkmarkIcon from '../assets/icons/checkmark.svg';
import { Box } from '@chakra-ui/react';
import { useState } from 'react';
import PageTransitionButton from '@components/PageTransitionButton';
import Searchbar from '@components/TableSearchBar';
import PageCounter from '@components/PageCounter';
import ApplicationTable from '@components/ApplicationTable';
import { UserType } from '@api/types';

const AdminLanding: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
  }
  return (
    <div className="flex flex-row h-screen">
      <NavBar logo={'BHCHP'} userType={UserType.ADMIN} />
      <Box
        id="main-content"
        p="10"
        flex="1"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <Box className="flex flex-row gap-6 pl-4 pt-4">
          <DashboardCard
            className="basis-1/4"
            title="Total Applications"
            value={298}
            description="All time submissions"
            icon={usersIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Pending Review"
            value={52}
            description="Awaiting decision"
            icon={clockIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Rejected"
            value={12}
            description="Not matched"
            icon={crossIcon}
          />

          <DashboardCard
            className="basis-1/4"
            title="Approved"
            value={102}
            description="Active volunteers "
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

        <Searchbar value={searchQuery} onChange={onChange}></Searchbar>
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            marginTop: '20px',
          }}
        >
          <ApplicationTable searchQuery={searchQuery} />
        </Box>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <PageTransitionButton
            buttonType="previous"
            onClick={() => setPage(page - 1)}
          />
          <PageCounter page={page} setPage={setPage} maxPages={1} />
          <PageTransitionButton
            buttonType="next"
            onClick={() => setPage(page + 1)}
          />
        </div>
      </Box>
    </div>
  );
};

export default AdminLanding;
