import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { requestOtp } from '../api/authApi';
import { LoginScreen } from '../screens/LoginScreen';

jest.mock('../api/authApi');

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an invalid phone number without calling the API', async () => {
    const navigation = { navigate: jest.fn() };
    render(<LoginScreen navigation={navigation} />);

    fireEvent.changeText(screen.getByTestId('phone-input'), '123');
    fireEvent.press(screen.getByText('Send OTP'));

    await waitFor(() => expect(screen.getByText(/valid 10-digit/i)).toBeTruthy());
    expect(requestOtp).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('sends OTP and navigates to the Otp screen on a valid phone number', async () => {
    requestOtp.mockResolvedValue({ resend_cooldown_seconds: 30 });
    const navigation = { navigate: jest.fn() };
    render(<LoginScreen navigation={navigation} />);

    fireEvent.changeText(screen.getByTestId('phone-input'), '9810000001');
    fireEvent.press(screen.getByText('Send OTP'));

    await waitFor(() => expect(requestOtp).toHaveBeenCalledWith('+919810000001'));
    expect(navigation.navigate).toHaveBeenCalledWith('Otp', {
      phone: '+919810000001',
      resendCooldownSeconds: 30,
    });
  });

  it('surfaces a server error without navigating', async () => {
    requestOtp.mockRejectedValue({ message: 'Too many OTP requests. Please try again later.' });
    const navigation = { navigate: jest.fn() };
    render(<LoginScreen navigation={navigation} />);

    fireEvent.changeText(screen.getByTestId('phone-input'), '9810000001');
    fireEvent.press(screen.getByText('Send OTP'));

    await waitFor(() => expect(screen.getByText(/too many otp requests/i)).toBeTruthy());
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
