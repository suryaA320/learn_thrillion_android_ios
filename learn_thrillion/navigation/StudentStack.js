import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudentPortalProvider } from '../context/StudentPortalContext';
import StudentDashboard from '../screens/student/StudentDashboard';
import StudentHomeworkScreen from '../screens/student/StudentHomeworkScreen';
import StudentStudyMaterialScreen from '../screens/student/StudentStudyMaterialScreen';
import StudentDiaryScreen from '../screens/student/StudentDiaryScreen';
import StudentComplaintsScreen from '../screens/student/StudentComplaintsScreen';
import StudentProgressScreen from '../screens/student/StudentProgressScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#4f46e5' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
  cardStyle: { backgroundColor: '#f5f3ff' },
  animation: 'fade',
};

export default function StudentStack() {
  return (
    <StudentPortalProvider>
      <Stack.Navigator initialRouteName="StudentHome" screenOptions={screenOptions}>
        <Stack.Screen name="StudentHome" component={StudentDashboard} options={{ headerShown: false }} />
        <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StudentStudyMaterial" component={StudentStudyMaterialScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StudentDiary" component={StudentDiaryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StudentComplaints" component={StudentComplaintsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="StudentProgress" component={StudentProgressScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </StudentPortalProvider>
  );
}
