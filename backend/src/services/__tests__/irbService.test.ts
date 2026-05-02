import { irbService } from '../irbService';

describe('IRBService', () => {
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';
  const mockAccountId = 'test-account-123';

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive-secret-key';

      const encrypted = irbService.encrypt(originalData, mockAccountId);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalData);

      const decrypted = irbService.decrypt(encrypted, mockAccountId);
      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted values for different account IDs', () => {
      const originalData = 'sensitive-secret-key';

      const encrypted1 = irbService.encrypt(originalData, 'account-1');
      const encrypted2 = irbService.encrypt(originalData, 'account-2');

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('getToken', () => {
    it('should throw error with invalid credentials', async () => {
      await expect(
        irbService.getToken('invalid-id', 'invalid-secret')
      ).rejects.toThrow();
    });
  });

  describe('getTinByNric', () => {
    it('should return default TIN when NRIC not found', async () => {
      const mockToken = 'mock-token';
      const result = await irbService.getTinByNric('000000000000', mockToken);

      // Should return default TIN when not found
      expect(result).toBe('EI00000000010');
    });
  });
});
