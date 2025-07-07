import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsDate,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

export enum LoginMethod {
  PASSWORD = 'password',
  OAUTH = 'oauth',
  SSO = 'sso',
  BIOMETRIC = 'biometric',
}

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PAGE_VIEW = 'page_view',
  API_CALL = 'api_call',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SECURITY_EVENT = 'security_event',
}

export class SessionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  browserVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ enum: LoginMethod })
  @IsOptional()
  @IsEnum(LoginMethod)
  loginMethod?: LoginMethod;

  @ApiProperty()
  @IsBoolean()
  isOnline: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastHeartbeat?: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  lastActivityAt: Date;

  @ApiProperty()
  @IsNumber()
  activityCount: number;

  @ApiProperty()
  @IsNumber()
  riskScore: number;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  suspiciousFlags: string[];

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  expiresAt: Date;

  @ApiProperty()
  @IsBoolean()
  isRevoked: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  revokedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  revokedReason?: string;
}

export class SessionActivityDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateSessionActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SessionFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRevoked?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minRiskScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxRiskScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suspiciousFlags?: string[];
}

export class SessionStatisticsDto {
  @ApiProperty()
  @IsNumber()
  totalSessions: number;

  @ApiProperty()
  @IsNumber()
  activeSessions: number;

  @ApiProperty()
  @IsNumber()
  revokedSessions: number;

  @ApiProperty()
  @IsNumber()
  highRiskSessions: number;

  @ApiProperty()
  @IsObject()
  deviceTypeDistribution: Record<DeviceType, number>;

  @ApiProperty()
  @IsObject()
  locationDistribution: Record<string, number>;

  @ApiProperty()
  @IsObject()
  browserDistribution: Record<string, number>;

  @ApiProperty()
  @IsObject()
  osDistribution: Record<string, number>;

  @ApiProperty()
  @IsArray()
  recentActivities: SessionActivityDto[];
}
