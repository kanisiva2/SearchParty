import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JoinParty = () => {
  const [partyCode, setPartyCode] = useState('');

  const handleJoin = async () => {
    if (!partyCode) {
      Alert.alert('Error', 'Please enter a party code.');
      return;
    }
  
    try {
      const q = query(
        collection(db, 'search_parties'),
        where('party_code', '==', partyCode)
      );
  
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        const partyData = querySnapshot.docs[0].data();
        const partyId = querySnapshot.docs[0].id;
  
        // Store last joined party in AsyncStorage
        await AsyncStorage.setItem('lastPartyId', partyId);
  
        Alert.alert('Success', 'Successfully joined the party!');
        router.replace(`/partyInfo?partyId=${partyId}`);
      } else {
        Alert.alert('Error', 'Party not found.');
      }
    } catch (error) {
      console.error('Error joining party:', error);
      Alert.alert('Error', 'Could not join the party.');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={partyCode}
        onChangeText={setPartyCode}
        placeholder="Enter Party Code"
        autoCapitalize="none"
      />
      <Button title="Join Party" onPress={handleJoin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: { width: '80%', padding: 10, borderWidth: 1, marginBottom: 20 },
});

export default JoinParty;
