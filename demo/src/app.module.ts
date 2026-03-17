import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { BrkptAuthModule } from './brkpt-auth/brkpt-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      global: true,
      wildcard: true,
    }),
    BrkptAuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        jwt: {
          access: {
            secret: config.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: '5m',
          },
          refresh: {
            secret: config.getOrThrow('JWT_REFRESH_SECRET'),
            expiresIn: '10m',
            transport: 'cookie',
          },
        },
        oauth: {
          google: {
            clientId: config.getOrThrow('GOOGLE_CLIENT_ID'),
            clientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
          },
          github: {
            clientId: config.getOrThrow('GITHUB_CLIENT_ID'),
            clientSecret: config.getOrThrow('GITHUB_CLIENT_SECRET'),
          },
        },
        otp: {
          expiresIn: '5m',
          codeLength: 6,
          emailClient: {
            host: config.getOrThrow('SMTP_HOST'),
            port: config.getOrThrow('SMTP_PORT'),
            user: config.getOrThrow('SMTP_USER'),
            pass: config.getOrThrow('SMTP_PASS'),
            from: config.getOrThrow('SMTP_FROM'),
          },
        },
        magicLink: {
          expiresIn: '5m',
          // In production, callbackUrls should point to your frontend, which extracts
          // the token from the magic link and forwards it to the backend. Demo only.
          callbackUrls: {
            authenticate: 'http://localhost:3000/auth/magic-link/authenticate',
            verifyEmail: 'http://localhost:3000/auth/verify-email/verify',
            resetPassword: 'http://localhost:3000/auth/reset-password/reset',
          },
          emailClient: {
            host: config.getOrThrow('SMTP_HOST'),
            port: config.getOrThrow('SMTP_PORT'),
            user: config.getOrThrow('SMTP_USER'),
            pass: config.getOrThrow('SMTP_PASS'),
            from: config.getOrThrow('SMTP_FROM'),
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
