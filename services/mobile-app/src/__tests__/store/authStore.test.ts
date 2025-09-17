import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';

// Mock fetch
const mockFetch = global.fetch as jest.Mock;

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });
    
    // Clear AsyncStorage
    AsyncStorage.clear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'operator',
        permissions: ['read'],
      };
      
      const mockToken = 'mock-jwt-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          user: mockUser,
          token: mockToken,
        }),
      });

      const { login } = useAuthStore.getState();
      const result = await login('test@example.com', 'password');

      expect(result).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().token).toBe(mockToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);

      // Check if data was stored in AsyncStorage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_data', JSON.stringify(mockUser));
    });

    it('should fail login with invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { login } = useAuthStore.getState();
      const result = await login('test@example.com', 'wrong-password');

      expect(result).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { login } = useAuthStore.getState();
      const result = await login('test@example.com', 'password');

      expect(result).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout and clear stored data', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', name: 'Test', role: 'operator', permissions: [] },
        token: 'token',
        isAuthenticated: true,
      });

      const { logout } = useAuthStore.getState();
      await logout();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Check if data was removed from AsyncStorage
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user_data');
    });
  });

  describe('initializeAuth', () => {
    it('should initialize auth from stored data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'operator',
        permissions: ['read'],
      };
      const mockToken = 'stored-token';

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(JSON.stringify(mockUser));

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().token).toBe(mockToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle missing stored data', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});