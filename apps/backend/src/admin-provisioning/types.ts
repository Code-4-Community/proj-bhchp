import { DISCIPLINE_VALUES } from '../disciplines/disciplines.constants';
import { UserType } from '../users/types';

export type MockCognitoCreateResult = {
  cognitoUsername: string;
  userStatus: 'FORCE_CHANGE_PASSWORD';
};

export type MockEmailDeliveryResult = {
  deliveryTriggered: boolean;
  deliveryMode: 'COGNITO_MANAGED_EMAIL';
};

export type MockDatabaseCreateResult = {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
  };
  adminInfo: {
    email: string;
    discipline: DISCIPLINE_VALUES;
    createdAt: string;
    updatedAt: string;
  };
};

export type ProvisionAdminResponse = {
  mode: 'mock';
  status:
    | 'SUCCESS'
    | 'COGNITO_CREATE_FAILED'
    | 'DATABASE_WRITE_FAILED_ROLLED_BACK'
    | 'DATABASE_WRITE_FAILED_ROLLBACK_FAILED';
  cognito: {
    attemptedCreate: boolean;
    attemptedRollback: boolean;
    cognitoUsername?: string;
    userStatus?: string;
    rollbackSucceeded?: boolean;
  };
  database: {
    attemptedTransaction: boolean;
    committed: boolean;
  };
  records: MockDatabaseCreateResult | null;
  notes: string[];
};
