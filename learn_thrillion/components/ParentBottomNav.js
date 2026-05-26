import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ParentBottomNav() {
  const navigation = useNavigation();
  const { signOut } = useAuth();

  return (
    <View style={styles.bottNav}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <TouchableOpacity style={styles.navItem}>
          <IconButton
            icon="home"
            size={26}
            iconColor="white"
            onPress={() => navigation.navigate('ParentDashboard')}
          />
          <Text style={styles.label}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <IconButton
            icon="message-text-outline"
            size={26}
            iconColor="white"
            onPress={() => navigation.navigate('ParentCommunications')}
          />
          <Text style={styles.label}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <IconButton icon="logout" size={26} iconColor="white" onPress={signOut} />
          <Text style={styles.label}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottNav: {
    backgroundColor: '#0f766e',
    height: 80,
    margin: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  scrollView: {
    paddingHorizontal: 0,
  },
  label: {
    color: 'white',
    fontSize: 12,
    marginTop: -12,
  },
});
