import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DetourCalculatorScreen } from '../screens/DetourCalculatorScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { PitStopScreen } from '../screens/PitStopScreen';
import { StationDetailScreen } from '../screens/StationDetailScreen';
import { backHeader } from './headerOptions';

const Stack = createNativeStackNavigator();

export function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreList" component={ExploreScreen} />
      <Stack.Screen name="StationDetail" component={StationDetailScreen} options={backHeader} />
      <Stack.Screen name="DetourCalculator" component={DetourCalculatorScreen} options={backHeader} />
      <Stack.Screen name="PitStop" component={PitStopScreen} />
    </Stack.Navigator>
  );
}
