import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer' | 'safety_manager';
  permissions: string[];
  avatar?: string;
  lastLogin?: Date;
  minesite?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  refreshToken: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      refreshToken: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // Simulate API call - replace with actual authentication
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock user data - replace with actual API response
          const mockUser: User = {
            id: '1',
            email,
            name: 'John Doe',
            role: 'admin',
            permissions: ['read', 'write', 'admin'],
            avatar: '/avatars/john-doe.jpg',
            lastLogin: new Date(),
            minesite: 'Copper Ridge Mine'
          };

          const mockToken = 'mock-jwt-token';
          const mockRefreshToken = 'mock-refresh-token';

          set({
            user: mockUser,
            isAuthenticated: true,
            token: mockToken,
            refreshToken: mockRefreshToken,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw new Error('Authentication failed');
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
          refreshToken: null
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return;

        try {
          // Simulate refresh token API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mock refresh response
          const newToken = 'new-mock-jwt-token';
          set({ token: newToken });
        } catch (error) {
          // If refresh fails, logout user
          get().logout();
        }
      },

      updateProfile: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'prism-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        refreshToken: state.refreshToken
      })
    }
  )
);