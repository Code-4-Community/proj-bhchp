/**
 * Summary of an admin account for the management list.
 */
export type AdminAccountSummary = {
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

/**
 * Result of a deactivate/reactivate operation.
 */
export type AdminLifecycleResult = {
  email: string;
  isActive: boolean;
};
