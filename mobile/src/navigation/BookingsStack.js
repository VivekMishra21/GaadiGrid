import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BookingsScreen } from '../screens/BookingsScreen';
import { DisputeScreen } from '../screens/DisputeScreen';
import { PaymentResultScreen } from '../screens/PaymentResultScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { backHeader } from './headerOptions';

const Stack = createNativeStackNavigator();

export function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsList" component={BookingsScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={backHeader} />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} options={backHeader} />
      <Stack.Screen name="Dispute" component={DisputeScreen} options={backHeader} />
    </Stack.Navigator>
  );
}
