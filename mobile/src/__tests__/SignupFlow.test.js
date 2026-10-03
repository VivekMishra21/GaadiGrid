import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { requestOtp } from '../api/authApi';
import { OtpScreen } from '../screens/OtpScreen';
import { SIGNUP_CONSENTS, SignupScreen } from '../screens/SignupScreen';
import { useAuthStore } from '../store/authStore';

jest.mock('../api/authApi');

function fillValid({ name = 'Riya Sharma', email = 'riya@example.com', phone = '9810000002', agree = true } = {}) {
  fireEvent.changeText(screen.getByTestId('signup-name-input'), name);
  fireEvent.changeText(screen.getByTestId('signup-email-input'), email);
  fireEvent.changeText(screen.getByTestId('signup-phone-input'), phone);
  if (agree) fireEvent.press(screen.getByTestId('signup-consent'));
}

describe('SignupScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates name, phone and consent before calling the API', async () => {
    const navigation = { navigate: jest.fn() };
    render(<SignupScreen navigation={navigation} />);

    fireEvent.press(screen.getByText('Get Started'));

    await waitFor(() => expect(screen.getByText('Enter your full name.')).toBeTruthy());
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText(/valid 10-digit/i)).toBeTruthy();
    expect(screen.getByText(/accept the Terms of Service/i)).toBeTruthy();
    expect(requestOtp).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('requires the consent checkbox even when the details are valid', async () => {
    render(<SignupScreen navigation={{ navigate: jest.fn() }} />);
    fillValid({ agree: false });
    fireEvent.press(screen.getByText('Get Started'));

    await waitFor(() => expect(screen.getByText(/accept the Terms of Service/i)).toBeTruthy());
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it('sends the OTP and carries the name + consents to the Otp screen', async () => {
    requestOtp.mockResolvedValue({ resend_cooldown_seconds: 30, dev_otp: '123456' });
    const navigation = { navigate: jest.fn() };
    render(<SignupScreen navigation={navigation} />);

    fillValid();
    fireEvent.press(screen.getByText('Get Started'));

    await waitFor(() => expect(requestOtp).toHaveBeenCalledWith('+919810000002'));
    expect(navigation.navigate).toHaveBeenCalledWith('Otp', {
      phone: '+919810000002',
      resendCooldownSeconds: 30,
      devOtp: '123456',
      signup: { fullName: 'Riya Sharma', email: 'riya@example.com', consents: SIGNUP_CONSENTS },
    });
  });

  it('links back to Login', () => {
    const navigation = { navigate: jest.fn() };
    render(<SignupScreen navigation={navigation} />);
    fireEvent.press(screen.getByText('Log In'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});

describe('OtpScreen with signup details', () => {
  it('creates the account in one step: verifies with name and both consents', async () => {
    const completeOtpLogin = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ completeOtpLogin });
    const route = {
      params: {
        phone: '+919810000002',
        resendCooldownSeconds: 30,
        signup: { fullName: 'Riya Sharma', email: 'riya@example.com', consents: SIGNUP_CONSENTS },
      },
    };
    render(<OtpScreen route={route} />);

    expect(screen.getByText('Verify to create your account')).toBeTruthy();
    // Name/consent fields are not asked for again.
    expect(screen.queryByTestId('full-name-input')).toBeNull();

    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByText('Verify & create account'));

    await waitFor(() =>
      expect(completeOtpLogin).toHaveBeenCalledWith({
        phone: '+919810000002',
        otp: '123456',
        fullName: 'Riya Sharma',
        email: 'riya@example.com',
        consents: SIGNUP_CONSENTS,
      })
    );
  });
});
