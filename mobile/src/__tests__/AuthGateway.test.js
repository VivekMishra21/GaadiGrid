import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGatewayScreen, ONBOARDING_STEPS } from '../screens/AuthGatewayScreen';

const mockPlayer = { loop: false, muted: false, play: jest.fn(), pause: jest.fn() };

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: (_source, setup) => {
      setup?.(mockPlayer);
      return mockPlayer;
    },
    VideoView: (props) => <View {...props} />,
  };
});

// The app's navigator supplies the safe-area context; tests give a phone with a notch and a gesture bar.
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const renderScreen = (navigation) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AuthGatewayScreen navigation={navigation} />
    </SafeAreaProvider>
  );

function setup() {
  const listeners = {};
  const navigation = {
    navigate: jest.fn(),
    addListener: jest.fn((event, cb) => {
      listeners[event] = cb;
      return () => delete listeners[event];
    }),
  };
  renderScreen(navigation);
  return { navigation, listeners };
}

describe('AuthGatewayScreen', () => {
  beforeEach(() => {
    mockPlayer.play.mockClear();
    mockPlayer.pause.mockClear();
    mockPlayer.loop = false;
    mockPlayer.muted = false;
  });

  it('shows the onboarding copy and sends the user into sign-up, log-in or help', () => {
    const { navigation } = setup();

    expect(screen.getByText('Step into Connected Mobility')).toBeTruthy();
    expect(screen.getByText(/Seamlessly manage, secure, and connect your vehicle/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('gateway-get-started'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('Signup');
    fireEvent.press(screen.getByTestId('gateway-login'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('Login');
    fireEvent.press(screen.getByTestId('gateway-help'));
    expect(navigation.navigate).toHaveBeenLastCalledWith('Help');
  });

  it('configures the video as muted, looping, controls-free and plays it', async () => {
    setup();
    await act(async () => {});
    expect(mockPlayer.muted).toBe(true);
    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.play).toHaveBeenCalled();
    const video = screen.getByTestId('gateway-video', { includeHiddenElements: true });
    expect(video.props.nativeControls).toBe(false);
    expect(video.props.contentFit).toBe('contain');
  });

  it('pauses when the screen loses focus or the app goes to the background, and resumes after', async () => {
    const { listeners } = setup();
    await act(async () => {});

    mockPlayer.pause.mockClear();
    mockPlayer.play.mockClear();
    act(() => listeners.blur());
    expect(mockPlayer.pause).toHaveBeenCalled();
    act(() => listeners.focus());
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('stops the player and removes its listeners on unmount (no leaks)', () => {
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
    const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) };
    const view = renderScreen(navigation);
    mockPlayer.pause.mockClear();
    view.unmount();
    expect(remove).toHaveBeenCalled();
    expect(mockPlayer.pause).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('is the last of the onboarding steps', () => {
    expect(ONBOARDING_STEPS).toBe(7);
  });
});
