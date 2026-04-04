import { SetMetadata } from '@nestjs/common';
import { UserType } from '../users/types';

/** Metadata key used by `RolesGuard` to read required user roles. */
export const ROLES_KEY = 'roles';

/**
 * Declares allowed user roles for a route handler or controller class.
 * @param roles One or more roles that are permitted to access the route.
 * @returns A Nest metadata decorator consumed by `RolesGuard`.
 */
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);
