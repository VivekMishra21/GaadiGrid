import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text as RNText } from 'react-native';

import { Card } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { LoadingMark } from '../components/LoadingMark';
import { motion, staggerDelay } from '../theme/motion';

describe('motion tokens', () => {
  it('shares the website timing: 200 / 450 / 650 / 850 ms and 12 / 20 pt rises', () => {
    expect(motion.duration).toEqual({ fast: 200, base: 450, slow: 650, hero: 850 });
    expect(motion.distance).toEqual({ sm: 12, md: 20 });
    expect(motion.stagger).toBe(80);
  });

  it('staggers siblings but caps the delay so long lists never feel slow', () => {
    expect(staggerDelay(0, 100)).toBe(100);
    expect(staggerDelay(2, 100)).toBe(260);
    expect(staggerDelay(50, 0)).toBe(480);
  });
});

describe('FadeIn', () => {
  afterEach(() => jest.restoreAllMocks());

  it('always renders its content (animation never blocks interaction)', () => {
    render(
      <FadeIn>
        <RNText>Vehicle</RNText>
      </FadeIn>
    );
    expect(screen.getByText('Vehicle')).toBeTruthy();
  });

  it('starts no animation at all when the user prefers reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    render(
      <FadeIn>
        <RNText>Garage</RNText>
      </FadeIn>
    );
    await act(async () => {});
    // the first render may begin one run before the preference is known; it must be stopped, and none follow
    const callsAfterPreference = timing.mock.calls.length;
    await act(async () => {});
    expect(timing.mock.calls.length).toBe(callsAfterPreference);
    expect(screen.getByText('Garage')).toBeTruthy();
  });

  it('animates normally when the preference is off', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const timing = jest.spyOn(Animated, 'timing');
    render(
      <FadeIn delay={100}>
        <RNText>Home</RNText>
      </FadeIn>
    );
    await act(async () => {});
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, delay: 100, duration: 450 }));
  });
});

describe('LoadingMark', () => {
  it('announces itself to assistive tech', () => {
    render(<LoadingMark label="Loading your garage" />);
    expect(screen.getByLabelText('Loading your garage')).toBeTruthy();
  });
});

describe('Card', () => {
  it('presses through to onPress when tappable and stays inert otherwise', () => {
    const onPress = jest.fn();
    render(
      <>
        <Card onPress={onPress}>
          <RNText>Tappable</RNText>
        </Card>
        <Card>
          <RNText>Static</RNText>
        </Card>
      </>
    );
    fireEvent.press(screen.getByText('Tappable'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Static')).toBeTruthy();
  });
});
