import * as React from 'react';
import { Appbar } from 'react-native-paper';
import { StyleSheet } from 'react-native';


const TopNav = ({title}) => (
  <Appbar.Header style={styles.topNavStyles}>
    <Appbar.BackAction onPress={() => {}} />
    <Appbar.Content title={title} />
    <Appbar.Action icon="calendar" onPress={() => {}} />
    <Appbar.Action icon="magnify" onPress={() => {}} />
  </Appbar.Header>
);

const styles = StyleSheet.create({
    topNavStyles: {
        backgroundColor: 'blue',
        borderRadius: 30
    }
})

export default TopNav;