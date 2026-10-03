import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { searchProviders } from '../api/providersApi';
import { submitContactMessage, submitPartnerEnquiry } from '../api/websiteApi';
import { AboutScreen } from '../screens/AboutScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { PartnerScreen } from '../screens/PartnerScreen';
import { ServicesScreen } from '../screens/ServicesScreen';

jest.mock('../api/websiteApi', () => ({
  WEBSITE_BASE_URL: 'http://localhost:3000',
  submitContactMessage: jest.fn(),
  submitPartnerEnquiry: jest.fn(),
}));
jest.mock('../api/providersApi');

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
});

const textOf = (node) =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : node?.props
        ? textOf(node.props.children)
        : '';

describe('About', () => {
  it('shows the story, how-it-works steps and why-GaadiGrid cards from the website', () => {
    render(<AboutScreen navigation={navigation} />);
    expect(screen.getByText('About GaadiGrid')).toBeTruthy();
    expect(screen.getByText('Where we operate')).toBeTruthy();
    expect(screen.getByText('Set your location')).toBeTruthy();
    expect(screen.getByText('Convenient discovery')).toBeTruthy();
  });
});

describe('Help & Contact', () => {
  it('expands an FAQ answer when tapped', () => {
    render(<HelpScreen navigation={navigation} />);
    expect(screen.queryByText(/Browse Car Wash or Vehicle Care, pick a service/)).toBeNull();
    fireEvent.press(screen.getByText('How do I book a car wash or vehicle care service?'));
    expect(screen.getByText(/Browse Car Wash or Vehicle Care, pick a service/)).toBeTruthy();
  });

  it('validates the contact form before calling the API', async () => {
    render(<HelpScreen navigation={navigation} />);
    fireEvent.press(screen.getByText('Send message'));
    await waitFor(() => expect(screen.getByText('Subject is required')).toBeTruthy());
    expect(submitContactMessage).not.toHaveBeenCalled();
  });

  it('sends a valid message and shows confirmation', async () => {
    submitContactMessage.mockResolvedValue({ ok: true });
    render(<HelpScreen navigation={navigation} />);
    fireEvent.changeText(screen.getByLabelText('Name'), 'Aarav');
    fireEvent.changeText(screen.getByLabelText('Email'), 'aarav@example.com');
    fireEvent.changeText(screen.getByLabelText('Subject'), 'Booking help');
    fireEvent.changeText(screen.getByLabelText('Message'), 'Need to reschedule');
    fireEvent.press(screen.getByText('Send message'));
    await waitFor(() => expect(screen.getByText(/Message sent/)).toBeTruthy());
    expect(submitContactMessage).toHaveBeenCalledWith({
      name: 'Aarav',
      email: 'aarav@example.com',
      subject: 'Booking help',
      message: 'Need to reschedule',
    });
  });
});

describe('Partner With Us', () => {
  it('requires a business type and valid details', async () => {
    render(<PartnerScreen navigation={navigation} />);
    fireEvent.press(screen.getByText('Become a Partner'));
    await waitFor(() => expect(screen.getByText('Select a business type')).toBeTruthy());
    expect(submitPartnerEnquiry).not.toHaveBeenCalled();
  });

  it('submits the enquiry and shows the thank-you state', async () => {
    submitPartnerEnquiry.mockResolvedValue({ ok: true });
    render(<PartnerScreen navigation={navigation} />);
    fireEvent.changeText(screen.getByLabelText('Business name'), 'Sparkle Auto Care');
    fireEvent.changeText(screen.getByLabelText('Your name'), 'Riya');
    fireEvent.changeText(screen.getByLabelText('Phone'), '9812345678');
    fireEvent.changeText(screen.getByLabelText('Email'), 'riya@example.com');
    fireEvent.press(screen.getByLabelText('Car Wash'));
    fireEvent.press(screen.getByText('Become a Partner'));
    await waitFor(() => expect(screen.getByText('Thanks — we got it')).toBeTruthy());
    expect(submitPartnerEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Sparkle Auto Care', businessType: 'Car Wash', city: 'Noida' })
    );
  });
});

describe('Services (Car Wash / Vehicle Care)', () => {
  const sponsored = { id: 1, business_name: 'Sparkle Auto Care', city: 'Noida', verification_status: 'VERIFIED', is_sponsored: true, review_count: 0 };
  const organic = { id: 2, business_name: 'Quick Wash', city: 'Noida', verification_status: 'VERIFIED', is_sponsored: false, review_count: 0 };

  it('lists car wash partners with sponsored ones first and clearly labelled', async () => {
    searchProviders.mockImplementation(({ category }) =>
      Promise.resolve({ items: category === 'CAR_WASH' ? [organic] : [sponsored] })
    );
    render(<ServicesScreen navigation={navigation} route={{ params: {} }} />);

    const hidden = { includeHiddenElements: true };
    await waitFor(() => expect(screen.getByText('Sparkle Auto Care', hidden)).toBeTruthy());
    expect(searchProviders).toHaveBeenCalledWith({ category: 'CAR_WASH' });
    expect(searchProviders).toHaveBeenCalledWith({ category: 'DETAILING' });
    expect(screen.getByText('★ Sponsored', hidden)).toBeTruthy();
    // Text renders its children inside a font-context provider, so read the rendered text.
    const names = screen.getAllByText(/Sparkle Auto Care|Quick Wash/, hidden).map((n) => textOf(n.props.children));
    expect(names).toEqual(['Sparkle Auto Care', 'Quick Wash']);
  });

  it('opens on Vehicle Care with the hero and "How we work" section when requested', async () => {
    searchProviders.mockResolvedValue({ items: [] });
    render(<ServicesScreen navigation={navigation} route={{ params: { group: 'VEHICLE_CARE' } }} />);

    expect(screen.getByText('Expert care for every drive')).toBeTruthy();
    await waitFor(() => expect(searchProviders).toHaveBeenCalledWith({ category: 'AC_SERVICE' }));
    expect(screen.getByText('Trained eyes catch what a quick glance misses')).toBeTruthy();
    expect(screen.getByText('Verified technicians', { exact: false })).toBeTruthy();
  });
});
