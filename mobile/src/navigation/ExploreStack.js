import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DetourCalculatorScreen } from '../screens/DetourCalculatorScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { StationDetailScreen } from '../screens/StationDetailScreen';

const Stack = createNativeStackNavigator();

export function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreList" component={ExploreScreen} />
      <Stack.Screen name="StationDetail" component={StationDetailScreen} />
      <Stack.Screen name="DetourCalculator" component={DetourCalculatorScreen} />
    </Stack.Navigator>
  );
}
