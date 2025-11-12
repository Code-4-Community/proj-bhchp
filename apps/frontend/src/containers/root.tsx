import StatisticsCard from '../components/StatisticsCard';
import { IoClose } from 'react-icons/io5';

const Root: React.FC = () => {
  return (
    <div>
      <h1>Welcome to scaffolding!</h1>
      <StatisticsCard
        title="Rejected"
        count={12}
        description="Not matched"
        icon={<IoClose size={20} />}
      />
    </div>
  );
};

export default Root;
