import { TotalApplicationsCard } from '@components/TotalApplicationsCard';
import { UsersRound } from 'lucide-react';

const Root: React.FC = () => {
  return (
    <>
      Welcome to scaffolding!
      <TotalApplicationsCard
        title="Total Applications"
        count={298}
        description="All time submissions"
        icon={<UsersRound />}
      />
    </>
  );
};

export default Root;
