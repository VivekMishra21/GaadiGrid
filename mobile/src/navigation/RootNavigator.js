import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { AddVehicleScreen } from '../screens/AddVehicleScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen, ONBOARDING_SEEN_KEY } from '../screens/OnboardingScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';
import { MainTabs } from './MainTabs';

const LOCATION_ASKED_KEY = 'gaadigrid_location_asked';
const Stack = createNativeStackNavigator();
const screenOptions = { headerShown: false };

export function RootNavigator() {
  const authStatus = useAuthStore((s) => s.status);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const vehiclesLoadedOnce = useVehicleStore((s) => s.hasLoadedOnce);
  const fetchVehicles = useVehicleStore((s) => s.fetchVehicles);

  const [onboardingSeen, setOnboardingSeen] = useState(null);
  const [locationAsked, setLocationAsked] = useState(null);

  useEffect(() => {
    bootstrap();
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY).then((v) => setOnboardingSeen(v === 'true'));
  }, [bootstrap]);

  useEffect(() => {
    if (authStatus !== 'signed_in') return;
    AsyncStorage.getItem(LOCATION_ASKED_KEY).then((v) => setLocationAsked(v === 'true'));
    fetchVehicles().catch(() => {});
    registerForPushNotificationsAsync();
  }, [authStatus, fetchVehicles]);

  function markLocationAsked() {
    AsyncStorage.setItem(LOCATION_ASKED_KEY, 'true');
    setLocationAsked(true);
  }

  if (authStatus === 'loading' || onboardingSeen === null) {
    return <SplashScreen />;
  }

  const needsOnboarding = authStatus === 'signed_out' && !onboardingSeen;
  const needsPostAuthSetup = authStatus === 'signed_in' && (locationAsked === null || !vehiclesLoadedOnce);
  const needsLocationPrompt = authStatus === 'signed_in' && locationAsked === false;
  const needsFirstVehicle = authStatus === 'signed_in' && locationAsked === true && vehicles.length === 0;

  if (needsPostAuthSetup) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {authStatus === 'signed_out' ? (
          <>
            {needsOnboarding ? (
              <Stack.Screen name="Onboarding">
                {() => <OnboardingScreen onDone={() => setOnboardingSeen(true)} />}
              </Stack.Screen>
            ) : null}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : needsLocationPrompt ? (
          <Stack.Screen name="LocationPermission">
            {() => <LocationPermissionScreen onDone={markLocationAsked} />}
          </Stack.Screen>
        ) : needsFirstVehicle ? (
          <Stack.Screen name="AddVehicle">{() => <AddVehicleScreen onDone={fetchVehicles} />}</Stack.Screen>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
