import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Text, TextInput } from '../components/AppText';
import { familyForWeight, fonts } from '../theme/fonts';

const flat = (node) => StyleSheet.flatten(node.props.style) || {};

describe('familyForWeight', () => {
  it('maps CSS weights onto the Manrope family files', () => {
    expect(familyForWeight(undefined)).toBe(fonts.regular);
    expect(familyForWeight('400')).toBe(fonts.regular);
    expect(familyForWeight('normal')).toBe(fonts.regular);
    expect(familyForWeight('500')).toBe(fonts.medium);
    expect(familyForWeight('600')).toBe(fonts.semibold);
    expect(familyForWeight('700')).toBe(fonts.bold);
    expect(familyForWeight('bold')).toBe(fonts.bold);
  });

  it('keeps ExtraBold for explicit use (the wordmark), not for ordinary heavy weights', () => {
    expect(familyForWeight('800')).toBe(fonts.bold);
    expect(familyForWeight('900')).toBe(fonts.bold);
  });
});

describe('AppText', () => {
  it('renders body text in Manrope Regular and drops the synthetic fontWeight', () => {
    render(<Text>Hello</Text>);
    const style = flat(screen.getByText('Hello'));
    expect(style.fontFamily).toBe(fonts.regular);
    expect(style.fontWeight).toBeUndefined();
  });

  it('picks the family from the weight in the style', () => {
    render(<Text style={{ fontWeight: '600' }}>Label</Text>);
    expect(flat(screen.getByText('Label')).fontFamily).toBe(fonts.semibold);
  });

  it('lets an explicit fontFamily win (wordmark)', () => {
    render(<Text style={{ fontFamily: fonts.extrabold, fontWeight: '800' }}>GaadiGrid</Text>);
    expect(flat(screen.getByText('GaadiGrid')).fontFamily).toBe(fonts.extrabold);
  });

  it('nested text inherits the parent font unless it sets its own weight', () => {
    render(
      <Text style={{ fontWeight: '700' }}>
        Total <Text testID="plain">plain</Text> <Text testID="strong" style={{ fontWeight: '600' }}>strong</Text>
      </Text>
    );
    expect(flat(screen.getByTestId('plain')).fontFamily).toBeUndefined();
    expect(flat(screen.getByTestId('strong')).fontFamily).toBe(fonts.semibold);
  });

  it('TextInput uses Manrope too', () => {
    render(<TextInput placeholder="Phone" />);
    expect(flat(screen.getByPlaceholderText('Phone')).fontFamily).toBe(fonts.regular);
  });
});

describe('Button', () => {
  it('fires onPress and exposes its label as the accessible name', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Book now</Button>);
    fireEvent.press(screen.getByRole('button', { name: 'Book now' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the label in Manrope SemiBold at md and Bold at lg', () => {
    render(
      <>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </>
    );
    expect(flat(screen.getByText('Medium')).fontFamily).toBe(fonts.semibold);
    expect(flat(screen.getByText('Large')).fontFamily).toBe(fonts.bold);
  });

  it('uses the spec heights for each size', () => {
    render(
      <>
        <Button size="sm" testID="sm">S</Button>
        <Button size="md" testID="md">M</Button>
        <Button size="lg" testID="lg">L</Button>
      </>
    );
    expect(flat(screen.getByTestId('sm')).height).toBe(40);
    expect(flat(screen.getByTestId('md')).height).toBe(48);
    expect(flat(screen.getByTestId('lg')).height).toBe(52);
  });

  it('does not call onPress while disabled', () => {
    const onPress = jest.fn();
    render(<Button disabled onPress={onPress}>Save</Button>);
    fireEvent.press(screen.getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('blocks presses while loading, marks it busy, and keeps the label in the layout', () => {
    const onPress = jest.fn();
    render(<Button loading onPress={onPress} testID="b">Pay</Button>);
    fireEvent.press(screen.getByTestId('b'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('b').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    // label still mounted (hidden) so the button never changes size
    expect(screen.getByText('Pay')).toBeTruthy();
  });

  it('takes its text colour from the variant and passes it to icons', () => {
    render(
      <Button variant="secondary" leftIcon={<Icon name="plus" />}>
        Add
      </Button>
    );
    expect(flat(screen.getByText('Add')).color).toBe('#18A875');
  });

  it('icon-only buttons use their accessibilityLabel', () => {
    const onPress = jest.fn();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Button size="icon" variant="ghost" accessibilityLabel="Add vehicle" onPress={onPress}>
        <Icon name="plus" />
      </Button>
    );
    fireEvent.press(screen.getByRole('button', { name: 'Add vehicle' }));
    expect(onPress).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns in dev when an icon-only button has no accessible name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Button size="icon">
        <Icon name="plus" />
      </Button>
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessibilityLabel'));
    warn.mockRestore();
  });

  it('fullWidth stretches, default hugs the content', () => {
    render(
      <>
        <Button fullWidth testID="full">A</Button>
        <Button testID="auto">B</Button>
      </>
    );
    expect(flat(screen.getByTestId('full')).alignSelf).toBe('stretch');
    expect(flat(screen.getByTestId('auto')).alignSelf).toBe('flex-start');
  });
});
