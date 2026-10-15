import { FakeAuthGateway } from '@/domain/testing/in-memory-repositories';
import { RequestPasswordReset } from '@/domain/usecases/request-password-reset';

function setup() {
  const gateway = new FakeAuthGateway();
  return { gateway, request: new RequestPasswordReset(gateway) };
}

describe('RequestPasswordReset (RF-AUTH-08.AC1)', () => {
  it('asks for the link with the trimmed email', async () => {
    const { request, gateway } = setup();

    await expect(request.execute({ email: ' ana@mail.com ' })).resolves.toEqual({
      status: 'sent',
    });

    expect(gateway.resetRequests).toEqual(['ana@mail.com']);
  });

  it('an invalid email is not sent, and says what is wrong', async () => {
    const { request, gateway } = setup();

    await expect(request.execute({ email: 'ana@mail' })).resolves.toEqual({
      status: 'invalid',
      email: 'missingDomain',
    });
    expect(gateway.resetRequests).toEqual([]);
  });

  it.each(['offline', 'failed'] as const)('passes «%s» through', async (outcome) => {
    const { request, gateway } = setup();
    gateway.resetOutcome = outcome;

    await expect(request.execute({ email: 'ana@mail.com' })).resolves.toEqual({
      status: outcome,
    });
  });
});
