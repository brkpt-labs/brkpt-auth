import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { Request } from 'express';
import { StringValue } from 'ms';

// Core
export type ExpiresIn = StringValue | number;

interface EmailClient {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface BrkptAuthModuleOptions {
  jwt: {
    access: {
      secret: string;
      expiresIn: ExpiresIn;
    };
    refresh: {
      secret: string;
      expiresIn: ExpiresIn;
      transport: 'cookie' | 'body';
    };
  };
  oauth?: {
    google?: { clientId: string; clientSecret: string };
    github?: { clientId: string; clientSecret: string };
  };
  otp?: {
    expiresIn: ExpiresIn;
    codeLength: number;
    emailClient?: EmailClient;
  };
  magicLink?: {
    expiresIn: ExpiresIn;
    callbackUrls: {
      authenticate: string;
    } & Partial<Record<VerificationFeature, string>>;
    emailClient?: EmailClient;
  };
}

export interface BrkptAuthModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports' | 'providers'
> {
  useFactory: (
    ...args: any[]
  ) => Promise<BrkptAuthModuleOptions> | BrkptAuthModuleOptions;
  inject?: any[];
}

export type PortProvider<TPort> = Provider & {
  provide: symbol;
  useClass: Type<TPort>;
};

export interface BrkptAuthRequest extends Request {
  user?: Record<string, unknown>;
  cookies: Record<string, string | undefined>;
}

export interface RequestMetadata {
  userAgent?: string;
  ip?: string;
}

export interface FeatureConfig {
  controllers: Type<any>[];
  providers: Provider[];
}

// Session
export interface SessionData {
  userId: unknown;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  metadata: RequestMetadata;
}

export interface SessionCreateEvent {
  sessionId: string;
  userId: unknown;
  ttlMs: number;
  metadata?: RequestMetadata;
}

export interface SessionValidateEvent {
  sessionId: string;
}

export interface SessionRefreshEvent {
  sessionId: string;
  metadata?: RequestMetadata;
}

export interface SessionRevokeEvent {
  sessionId: string;
}

export interface SessionRevokeOthersEvent {
  sessionId: string;
  userId: unknown;
}

export type SessionAnomalyType = 'ip_changed' | 'user_agent_changed';

export interface SessionAnomalyEvent {
  sessionId: string;
  userId: unknown;
  type: SessionAnomalyType;
  previous: string;
  current: string;
}

export interface SessionManualRevokeEvent {
  sessionId: string;
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface SessionManualRevokeOthersEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

// Verification
export type VerificationFeature = 'verifyEmail' | 'resetPassword';

export interface VerificationSendEvent {
  target: string;
  strategy: string;
  method: string;
  feature: VerificationFeature;
}

export interface VerificationVerifyEvent {
  target: string;
  strategy: string;
  proof: string;
}

// User
export interface UserDeleteEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

// Auth Events
export type AuthFeature = 'credentials' | 'oauth' | 'otp' | 'magic-link';

export interface SignUpEvent {
  userId: unknown;
  feature: AuthFeature;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface SignInEvent {
  userId: unknown;
  feature: AuthFeature;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface SignOutEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface VerifyEmailEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface ChangePasswordEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}

export interface ResetPasswordEvent {
  userId: unknown;
  timestamp: number;
  metadata?: RequestMetadata;
}
