import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentPortalProvider } from '../context/ParentPortalContext';
import ParentHome from '../screens/parent/ParentHome';
import ParentDiaryScreen from '../screens/parent/ParentDiaryScreen';
import ParentComplaintsScreen from '../screens/parent/ParentComplaintsScreen';
import ParentProgressScreen from '../screens/parent/ParentProgressScreen';
import ParentFeesScreen from '../screens/parent/ParentFeesScreen';
import ParentProfile from '../screens/parent/ParentProfile';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#0d9488' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
  cardStyle: { backgroundColor: '#f2f2f2' },
  animation: 'fade',
};

export default function ParentStack() {
  return (
    <ParentPortalProvider>
      <Stack.Navigator initialRouteName="ParentHome" screenOptions={screenOptions}>
        <Stack.Screen name="ParentHome" component={ParentHome} options={{ headerShown: false }} />
        <Stack.Screen name="ParentFees" component={ParentFeesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ParentDiary" component={ParentDiaryScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ParentComplaints"
          component={ParentComplaintsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ParentProgress"
          component={ParentProgressScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="ParentProfile" component={ParentProfile} options={{ headerShown: false }} />
      </Stack.Navigator>
    </ParentPortalProvider>
  );
}
