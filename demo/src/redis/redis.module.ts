import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      async useFactory(config: ConfigService) {
        const client = createClient({
          socket: {
            host: config.getOrThrow('REDIS_HOST'),
            port: config.getOrThrow('REDIS_PORT'),
          },
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
