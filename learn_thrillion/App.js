import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { navigationRef } from './navigation/navigationRef';
import NotificationPanel from './components/NotificationPanel';
import { isFacultyLikeRole, isParentRole, isStudentRole } from './constants/roles';
import FacultyStack from './navigation/FacultyStack';
import ParentStack from './navigation/ParentStack';
import StudentStack from './navigation/StudentStack';
import Login from './screens/Login';
import UnsupportedRole from './screens/UnsupportedRole';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, role, ready } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 14, color: '#64748b' }}>Loading…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    );
  }

  if (isFacultyLikeRole(role)) {
    return <FacultyStack />;
  }

  if (isStudentRole(role)) {
    return <StudentStack />;
  }

  if (isParentRole(role)) {
    return <ParentStack />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UnsupportedRole" component={UnsupportedRole} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
          <NotificationPanel />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
