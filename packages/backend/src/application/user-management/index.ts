// User Management Application Layer - Main Barrel Export

// Module
export { UserManagementApplicationModule } from './user-management-application.module';

// Commands
export {
  CreateUserCommand,
  CreateUserHandler,
  UpdateUserCommand,
  UpdateUserHandler,
  DeleteUserCommand,
  DeleteUserHandler,
  LockUserCommand,
  LockUserHandler,
  UnlockUserCommand,
  UnlockUserHandler,
  GrantPermissionCommand,
  GrantPermissionHandler,
  RevokePermissionCommand,
  RevokePermissionHandler,
} from './commands';

// Queries
export {
  GetAllUsersQuery,
  GetAllUsersQueryHandler,
  GetUserByIdQuery,
  GetUserByIdQueryHandler,
  GetNavigationPermissionsQuery,
  GetNavigationPermissionsQueryHandler,
  GetUserPermissionsQuery,
  GetUserPermissionsQueryHandler,
  GetAvailablePermissionsQuery,
  GetAvailablePermissionsQueryHandler,
} from './queries';
export type { NavigationUserRole } from './queries';

// DTOs
export {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  DeleteUserDto,
  LockUserDto,
  GrantPermissionDto,
  DeleteUserResponseDto,
  UserBasicDto,
  UserBasicListResponse,
  ManagedUserResponseDto,
  ManagedUsersListResponse,
  ManagedUserResponse,
  DeleteManagedUserResponse,
  NavigationPermissionDto,
  AvailablePermissionDto,
  UserPermissionDto,
  UserPermissionsListResponse,
} from './dto';

// Mappers
export { UserQueryMapper } from './mappers';
export { toDeleteUserResponseDto } from './dto/user-response.mapper';
