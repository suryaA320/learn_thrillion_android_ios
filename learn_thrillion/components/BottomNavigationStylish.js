import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

const BottomNavigationStylish = () => {
    const navigation = useNavigation();
    const { signOut } = useAuth();
    return (
        <View style={styles.bottNav}>
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.scrollView}>
                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="home"
                        size={26}
                        iconColor="white"
                        onPress={() => navigation.navigate('Dashboard')}
                    />
                    <Text style={styles.label}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="bookshelf"
                        size={26}
                        iconColor="white"
                        onPress={() => navigation.navigate('Add-homework')}
                    />
                    <Text style={styles.label}>Homework</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="chart-box"
                        size={26}
                        iconColor="white"
                        onPress={() => navigation.navigate('Add-Attendance')}
                    />
                    <Text style={styles.label}>Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="notebook-edit-outline"
                        size={26}
                        iconColor="white"
                        onPress={() => navigation.navigate('Add-planning')}
                    />
                    <Text style={styles.label}>Planning</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="balcony"
                        size={26}
                        iconColor="white"
                        onPress={() => navigation.navigate('Add-Complaints')}
                    />
                    <Text style={styles.label}>Complaints</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                    <IconButton
                        icon="logout"
                        size={26}
                        iconColor="white"
                        onPress={signOut}
                    />
                    <Text style={styles.label}>Sign out</Text>
                </TouchableOpacity>
            </ScrollView >
        </View>
    );
};

const styles = StyleSheet.create({
    bottNav: {
        backgroundColor: 'black',
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
        marginBottom: 20
    },
    scrollView: {
        paddingHorizontal: 0, // space at start and end
      },
    label: {
        color: 'white',
        fontSize: 12,
        marginTop: -12,
    },
});

export default BottomNavigationStylish;
