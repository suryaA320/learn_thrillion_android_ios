import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FacultyDashboard from '../screens/faculty/FacultyDashboard';
import FacultyAttendance from '../screens/faculty/FacultyAttendance';
import FacultyComplaints from '../screens/faculty/FacultyComplaints';
import FacultyPlanning from '../screens/faculty/FacultyPlanning';
import FacultySyllabusPlanning from '../screens/faculty/FacultySyllabusPlanning';
import FacultyAddHomework from '../screens/faculty/FacultyAddHomework';
import FacultyStudyMaterial from '../screens/faculty/FacultyStudyMaterial';
import FacultyProfile from '../screens/faculty/FacultyProfile';
import FacultyLeaves from '../screens/faculty/FacultyLeaves';
import FacultyMarksEntry from '../screens/faculty/FacultyMarksEntry';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#4f46e5' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
  cardStyle: { backgroundColor: '#f5f3ff' },
  animation: 'fade',
};

export default function FacultyStack() {
  return (
    <Stack.Navigator initialRouteName="FacultyHome" screenOptions={screenOptions}>
      <Stack.Screen name="FacultyHome" component={FacultyDashboard} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyLeaves" component={FacultyLeaves} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyAttendance" component={FacultyAttendance} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyMarks" component={FacultyMarksEntry} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyComplaints" component={FacultyComplaints} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyPlanning" component={FacultyPlanning} options={{ headerShown: false }} />
      <Stack.Screen name="FacultySyllabusPlanning" component={FacultySyllabusPlanning} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyHomework" component={FacultyAddHomework} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyStudyMaterial" component={FacultyStudyMaterial} options={{ headerShown: false }} />
      <Stack.Screen name="FacultyProfile" component={FacultyProfile} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
