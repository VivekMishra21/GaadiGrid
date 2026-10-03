import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { AboutScreen } from '../screens/AboutScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { FleetScreen } from '../screens/FleetScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PartnerScreen } from '../screens/PartnerScreen';
import { ServiceRecordFormScreen } from '../screens/ServiceRecordFormScreen';
import { GarageScreen } from '../screens/GarageScreen';
import { VehicleFormScreen } from '../screens/VehicleFormScreen';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { shadow } from '../theme/tokens';
import { BookingsStack } from './BookingsStack';
import { ExploreStack } from './ExploreStack';
import { backHeader } from './headerOptions';
import { ServicesStack } from './ServicesStack';

const Tab = createBottomTabNavigator();
const ProfileStackNav = createNativeStackNavigator();

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileHome" component={GarageScreen} />
      <ProfileStackNav.Screen name="VehicleForm" component={VehicleFormScreen} options={backHeader} />
      <ProfileStackNav.Screen name="Expenses" component={ExpensesScreen} options={backHeader} />
      <ProfileStackNav.Screen name="Notifications" component={NotificationsScreen} options={backHeader} />
      <ProfileStackNav.Screen name="Partner" component={PartnerScreen} />
      <ProfileStackNav.Screen name="About" component={AboutScreen} />
      <ProfileStackNav.Screen name="Help" component={HelpScreen} />
      <ProfileStackNav.Screen name="ServiceRecordForm" component={ServiceRecordFormScreen} />
      <ProfileStackNav.Screen name="Fleet" component={FleetScreen} />
    </ProfileStackNav.Navigator>
  );
}

const TAB_META = {
  Home: { label: 'Home', icon: 'home' },
  Explore: { label: 'Explore', icon: 'fuel' },
  Services: { label: 'Services', icon: 'sparkles' },
  Bookings: { label: 'Bookings', icon: 'calendarCheck' },
  // The route is still called "Profile" because other screens navigate to it by name.
  Profile: { label: 'Garage', icon: 'car' },
};

function TabIcon({ routeName, focused }) {
  const { icon } = TAB_META[routeName];
  return (
    <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
      <Icon name={icon} size={21} color={focused ? colors.greenDark : colors.textMuted} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  pill: { width: 54, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: colors.greenSoft },
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    ...shadow.raised,
  },
  label: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        tabBarStyle: tabStyles.bar,
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabel: TAB_META[route.name].label,
        tabBarLabelStyle: tabStyles.label,
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen name="Services" component={ServicesStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
