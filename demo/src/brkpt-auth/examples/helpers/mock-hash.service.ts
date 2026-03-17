import { Injectable } from '@nestjs/common';

@Injectable()
export class MockHashService {
  hash(plain: string) {
    return Promise.resolve(`hashed_${plain}`);
  }

  async compare(plain: string, hashed: string) {
    return (await this.hash(plain)) === hashed;
  }
}
