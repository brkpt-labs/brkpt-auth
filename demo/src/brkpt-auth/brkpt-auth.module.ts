import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { RedisModule } from '../redis/redis.module';
import { UserModule } from '../user/user.module';
import { BRKPT_AUTH_MODULE_OPTIONS } from './common/constants';
import {
  BrkptAuthModuleAsyncOptions,
  BrkptAuthModuleOptions,
} from './common/interfaces';
import { MockHashService } from './examples/helpers/mock-hash.service';
import { features } from './features';

@Module({
  imports: [
    // demo: replace with your own module (e.g. PrismaModule, DatabaseModule)
    UserModule,
    RedisModule,
  ],
  controllers: [...features.flatMap((f) => f.controllers)],
  providers: [
    ...features.flatMap((f) => f.providers),

    // demo helper
    MockHashService,
  ],
})
export class BrkptAuthModule {
  static forRoot(options: BrkptAuthModuleOptions): DynamicModule {
    return {
      module: BrkptAuthModule,
      imports: [
        JwtModule.register({
          global: true,
          secret: options.jwt.access.secret,
          signOptions: {
            expiresIn: options.jwt.access.expiresIn,
          },
        }),
      ],
      providers: [
        {
          provide: BRKPT_AUTH_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  static forRootAsync(options: BrkptAuthModuleAsyncOptions): DynamicModule {
    return {
      module: BrkptAuthModule,
      imports: [
        ...(options.imports || []),
        JwtModule.registerAsync({
          global: true,
          imports: options.imports || [],
          inject: options.inject || [],
          useFactory: async (...args: any) => {
            const config = await options.useFactory.apply(null, args);
            return {
              secret: config.jwt.access.secret,
              signOptions: {
                expiresIn: config.jwt.access.expiresIn,
              },
            };
          },
        }),
      ],
      providers: [
        ...(options.providers || []),
        {
          provide: BRKPT_AUTH_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
    };
  }
}
