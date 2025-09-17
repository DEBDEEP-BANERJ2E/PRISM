import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '@/screens/LoginScreen';
import { useAuthStore } from '@/store/authStore';

// Mock the auth store
jest.mock('@/store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      login: mockLogin,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });
  });

  it('should render login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText('PRISM')).toBeTruthy();
    expect(getByText('Predictive Rockfall Intelligence')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);
    
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter both email and password'
      );
    });
  });

  it('should call login function with correct credentials', async () => {
    mockLogin.mockResolvedValue(true);
    
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should show error on failed login', async () => {
    mockLogin.mockResolvedValue(false);
    
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login Failed',
        'Invalid email or password'
      );
    });
  });

  it('should show loading state during login', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      token: null,
      login: mockLogin,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    const { getByText } = render(<LoginScreen />);
    
    expect(getByText('Signing In...')).toBeTruthy();
  });

  it('should disable button during loading', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      token: null,
      login: mockLogin,
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    const { getByText } = render(<LoginScreen />);
    
    const signInButton = getByText('Signing In...');
    expect(signInButton.props.accessibilityState?.disabled).toBe(true);
  });
});