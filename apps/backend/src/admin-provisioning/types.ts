import { UserType } from '../users/types';

export type CognitoCreateResult = {
  cognitoUsername: string;
  userStatus: 'FORCE_CHANGE_PASSWORD';
};

export type DatabaseCreateResult = {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    userType: UserType;
  };
  adminInfo: {
    email: string;
    disciplines: string[];
    createdAt: string;
    updatedAt: string;
  };
};

export type ProvisionAdminResponse = {
  mode: 'live';
  status:
    | 'SUCCESS'
    | 'DUPLICATE_RECORD'
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
  records: DatabaseCreateResult | null;
  notes: string[];
};
