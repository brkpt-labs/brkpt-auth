/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';

import {
  ChangePasswordEvent,
  ResetPasswordEvent,
  SessionAnomalyEvent,
  SessionManualRevokeEvent,
  SessionManualRevokeOthersEvent,
  SignInEvent,
  SignOutEvent,
  SignUpEvent,
  UserDeleteEvent,
  VerifyEmailEvent,
} from '../../common/interfaces';
import { AuditPort, BRKPT_AUTH_AUDIT_PORT } from './audit.port';
import { AuditService } from './audit.service';

const mockPort: jest.Mocked<AuditPort> = {
  handleSignUp: jest.fn(),
  handleSignIn: jest.fn(),
  handleSignOut: jest.fn(),
  handleVerifyEmail: jest.fn(),
  handleChangePassword: jest.fn(),
  handleResetPassword: jest.fn(),
  handleSessionAnomaly: jest.fn(),
  handleSessionManualRevoke: jest.fn(),
  handleSessionManualRevokeOthers: jest.fn(),
  handleUserDelete: jest.fn(),
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: BRKPT_AUTH_AUDIT_PORT, useValue: mockPort },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should delegate handleSignUp to port', async () => {
    const event: SignUpEvent = {
      userId: 1,
      feature: 'credentials',
      timestamp: Date.now(),
    };

    await service.handleSignUp(event);

    expect(mockPort.handleSignUp).toHaveBeenCalledWith(event);
  });

  it('should delegate handleSignIn to port', async () => {
    const event: SignInEvent = {
      userId: 1,
      feature: 'credentials',
      timestamp: Date.now(),
    };

    await service.handleSignIn(event);

    expect(mockPort.handleSignIn).toHaveBeenCalledWith(event);
  });

  it('should delegate handleSignOut to port', async () => {
    const event: SignOutEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleSignOut(event);

    expect(mockPort.handleSignOut).toHaveBeenCalledWith(event);
  });

  it('should delegate handleVerifyEmail to port', async () => {
    const event: VerifyEmailEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleVerifyEmail(event);

    expect(mockPort.handleVerifyEmail).toHaveBeenCalledWith(event);
  });

  it('should delegate handleChangePassword to port', async () => {
    const event: ChangePasswordEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleChangePassword(event);

    expect(mockPort.handleChangePassword).toHaveBeenCalledWith(event);
  });

  it('should delegate handleResetPassword to port', async () => {
    const event: ResetPasswordEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleResetPassword(event);

    expect(mockPort.handleResetPassword).toHaveBeenCalledWith(event);
  });

  it('should delegate handleSessionAnomaly to port', async () => {
    const event: SessionAnomalyEvent = {
      sessionId: 'session-1',
      userId: 1,
      type: 'ip_changed',
      previous: '127.0.0.1',
      current: '192.168.1.1',
    };

    await service.handleSessionAnomaly(event);

    expect(mockPort.handleSessionAnomaly).toHaveBeenCalledWith(event);
  });

  it('should delegate handleSessionManualRevoke to port', async () => {
    const event: SessionManualRevokeEvent = {
      sessionId: 'session-1',
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleSessionManualRevoke(event);

    expect(mockPort.handleSessionManualRevoke).toHaveBeenCalledWith(event);
  });

  it('should delegate handleSessionManualRevokeOthers to port', async () => {
    const event: SessionManualRevokeOthersEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleSessionManualRevokeOthers(event);

    expect(mockPort.handleSessionManualRevokeOthers).toHaveBeenCalledWith(
      event,
    );
  });

  it('should delegate handleUserDelete to port', async () => {
    const event: UserDeleteEvent = {
      userId: 1,
      timestamp: Date.now(),
    };

    await service.handleUserDelete(event);

    expect(mockPort.handleUserDelete).toHaveBeenCalledWith(event);
  });
});
