import merge from 'lodash/merge';

import { Learner } from '../../learners/learner.entity';

export const defaultLearner: Learner = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-06-30'),
  appId: 1,
};

export const learnerFactory = (learner: Partial<Learner> = {}): Learner =>
  merge({}, defaultLearner, learner);

export default learnerFactory;
