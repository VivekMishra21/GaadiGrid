import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BookingConfirmedScreen } from '../screens/BookingConfirmedScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { ProviderDetailScreen } from '../screens/ProviderDetailScreen';
import { ServicesScreen } from '../screens/ServicesScreen';

const Stack = createNativeStackNavigator();

export function ServicesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServicesList" component={ServicesScreen} />
      <Stack.Screen name="ProviderDetail" component={ProviderDetailScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
    </Stack.Navigator>
  );
}
