import { Injectable } from '@nestjs/common';

import { User } from '../user.entity';

/**
 * In-memory User Repository (for demo/testing)
 *
 * Replace with real repository in production:
 * - PrismaUserRepository
 * - TypeOrmUserRepository
 * - MongoUserRepository
 */
@Injectable()
export class MemoryUserRepository {
  private users: User[] = [];
  private currentId = 1;

  constructor() {
    this.users = [
      {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        emailVerified: false,
      },
      {
        id: 2,
        email: 'verified@example.com',
        name: 'Verified User',
        password: 'hashed_password',
        emailVerified: true,
      },
      {
        id: 3,
        email: 'other@example.com',
        name: 'Other User',
        password: 'hashed_password',
        emailVerified: true,
      },
    ];
    this.currentId = 4;
  }

  findOne(predicate: (u: User) => boolean): Promise<User | null> {
    return Promise.resolve(this.users.find(predicate) || null);
  }

  findAll(): Promise<User[]> {
    return Promise.resolve([...this.users]);
  }

  create(data: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      id: this.currentId++,
      ...data,
    };
    this.users.push(newUser);
    return Promise.resolve(newUser);
  }

  update(id: number, data: Partial<Omit<User, 'id'>>): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with id ${id} not found`);
    }

    const updated = { ...this.users[userIndex]!, ...data };
    this.users[userIndex] = updated;
    return Promise.resolve(updated);
  }

  delete(id: number): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with id ${id} not found`);
    }
    const [deleted] = this.users.splice(userIndex, 1);
    return Promise.resolve(deleted!);
  }
}
