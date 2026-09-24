import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { VehicleForm } from '../components/VehicleForm';

describe('VehicleForm', () => {
  it('submits with the default chip selections and entered text', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<VehicleForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('DL01AB1234'), 'dl01ab1234');
    fireEvent.changeText(screen.getByPlaceholderText('Maruti Suzuki'), 'Hyundai');
    fireEvent.changeText(screen.getByPlaceholderText('Swift'), 'i20');

    fireEvent.press(screen.getByText('Save vehicle'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicle_type: 'CAR',
        fuel_type: 'PETROL',
        registration_number: 'DL01AB1234',
        brand: 'Hyundai',
        model: 'i20',
      })
    );
  });

  it('switches vehicle type and fuel type via chip selection', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<VehicleForm onSubmit={onSubmit} />);

    fireEvent.press(screen.getByText('Bike'));
    fireEvent.press(screen.getByText('CNG'));

    fireEvent.changeText(screen.getByPlaceholderText('DL01AB1234'), 'DL01AB1234');
    fireEvent.changeText(screen.getByPlaceholderText('Maruti Suzuki'), 'Bajaj');
    fireEvent.changeText(screen.getByPlaceholderText('Swift'), 'Pulsar');

    fireEvent.press(screen.getByText('Save vehicle'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ vehicle_type: 'BIKE', fuel_type: 'CNG' })
    );
  });

  it('rejects an unrealistic mileage value and does not submit', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('DL01AB1234'), 'DL01AB1234');
    fireEvent.changeText(screen.getByPlaceholderText('Maruti Suzuki'), 'Hyundai');
    fireEvent.changeText(screen.getByPlaceholderText('Swift'), 'i20');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 18.5'), '5000');

    fireEvent.press(screen.getByText('Save vehicle'));

    await waitFor(() => expect(screen.getByText(/realistic mileage/i)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an invalid registration number and does not submit', async () => {
    const onSubmit = jest.fn();
    render(<VehicleForm onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByPlaceholderText('DL01AB1234'), 'not a plate');
    fireEvent.changeText(screen.getByPlaceholderText('Maruti Suzuki'), 'Hyundai');
    fireEvent.changeText(screen.getByPlaceholderText('Swift'), 'i20');

    fireEvent.press(screen.getByText('Save vehicle'));

    await waitFor(() => expect(screen.getByText(/valid registration number/i)).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
