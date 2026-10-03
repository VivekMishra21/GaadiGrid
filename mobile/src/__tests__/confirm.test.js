import { Alert, Platform } from 'react-native';

import { confirmAction } from '../utils/confirm';

describe('confirmAction', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.restoreAllMocks();
  });

  it('shows a native alert and runs the action only from the destructive button', () => {
    Platform.OS = 'ios';
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onConfirm = jest.fn();
    confirmAction({ title: 'Sign out', message: 'Sure?', confirmLabel: 'Sign out', onConfirm });

    expect(spy).toHaveBeenCalledWith('Sign out', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      expect.objectContaining({ text: 'Sign out', style: 'destructive' }),
    ]);
    expect(onConfirm).not.toHaveBeenCalled();
    spy.mock.calls[0][2][1].onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('uses window.confirm on the web build (Alert.alert is a no-op there)', () => {
    Platform.OS = 'web';
    const onConfirm = jest.fn();
    global.window = global.window || {};
    const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    global.window.confirm = confirm;

    confirmAction({ title: 'Sign out', message: 'Sure?', onConfirm });
    expect(onConfirm).not.toHaveBeenCalled();
    confirmAction({ title: 'Sign out', message: 'Sure?', onConfirm });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
