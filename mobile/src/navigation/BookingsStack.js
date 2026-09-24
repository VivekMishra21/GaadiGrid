import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BookingsScreen } from '../screens/BookingsScreen';
import { DisputeScreen } from '../screens/DisputeScreen';
import { PaymentResultScreen } from '../screens/PaymentResultScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ReviewScreen } from '../screens/ReviewScreen';

const Stack = createNativeStackNavigator();

export function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsList" component={BookingsScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen name="Dispute" component={DisputeScreen} />
    </Stack.Navigator>
  );
}
