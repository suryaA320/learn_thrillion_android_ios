import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ParentDashboard from '../screens/parent/ParentDashboard';
import ParentCommunications from '../screens/parent/ParentCommunications';
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
    <Stack.Navigator initialRouteName="ParentDashboard" screenOptions={screenOptions}>
      <Stack.Screen name="ParentDashboard" component={ParentDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="ParentCommunications" component={ParentCommunications} options={{ headerShown: false }} />
      <Stack.Screen name="ParentProfile" component={ParentProfile} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
