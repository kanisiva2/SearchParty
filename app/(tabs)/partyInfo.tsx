import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PartySettings() {
  const params = useLocalSearchParams();
  const partyId = params?.partyId ? String(params.partyId) : null;
  const [partyData, setPartyData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [updatedData, setUpdatedData] = useState({
    name: '',
    age: '',
    description: '',
    search_radius_km: '',
  });

  useEffect(() => {
    const fetchPartyDetails = async () => {
      if (!partyId) {
        console.error('Invalid or missing partyId');
        setLoading(false);
        return;
      }
      try {
        const partyRef = doc(db, 'search_parties', partyId);
        const partySnap = await getDoc(partyRef);
        if (partySnap.exists()) {
          const data = partySnap.data();
          setPartyData(data);
          setUpdatedData({
            name: data.missing_person.name,
            age: data.missing_person.age,
            description: data.missing_person.description,
            search_radius_km: data.search_radius_km,
          });
          setIsCreator(auth.currentUser?.uid === data.creator_id);
        }
      } catch (error) {
        console.error('Error fetching party details:', error);
      }
      setLoading(false);
    };
    fetchPartyDetails();
  }, [partyId]);

  const handleUpdate = async () => {
    try {
      if (!partyId) return;
      await updateDoc(doc(db, 'search_parties', partyId), {
        'missing_person.name': updatedData.name,
        'missing_person.age': updatedData.age,
        'missing_person.description': updatedData.description,
        search_radius_km: updatedData.search_radius_km,
      });
      Alert.alert('Success', 'Party details updated!');
    } catch (error) {
      console.error('Error updating party:', error);
      Alert.alert('Error', 'Could not update party details.');
    }
  };

  const handleLeaveParty = async () => {
    try {
      if (!partyId) return;
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be signed in to leave a party.');
        return;
      }
      await updateDoc(doc(db, 'search_parties', partyId), {
        participants: arrayRemove(user.uid),
      });
      await AsyncStorage.removeItem('lastPartyId');
      Alert.alert('Success', 'You have left the party.');
      router.replace('/home');
    } catch (error) {
      console.error('Error leaving party:', error);
      Alert.alert('Error', 'Could not leave the party.');
    }
  };

  if (loading) return <ActivityIndicator size='large' color='#2563EB' style={styles.loading} />;
  if (!partyId) return <Text style={styles.error}>Error: No party selected.</Text>;
  if (!partyData) return <Text style={styles.error}>Party not found.</Text>;

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.joinCode}>Join Code: <Text style={styles.joinCodeText}>{partyData.party_code}</Text></Text>

        {/* Display image if it exists */}
        {partyData?.missing_person?.image_url ? (
          <Image 
            source={{ uri: partyData.missing_person.image_url }} 
            style={styles.image} 
          />
        ) : (
          <Text>No image available</Text>
        )}

        {isCreator ? (
          <>
            <Text style={styles.sectionTitle}>Missing Person Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput 
                style={styles.input} 
                value={updatedData.name} 
                onChangeText={(text) => setUpdatedData({ ...updatedData, name: text })} 
                autoCapitalize='none' 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput 
                style={styles.input} 
                value={updatedData.age} 
                onChangeText={(text) => setUpdatedData({ ...updatedData, age: text })} 
                autoCapitalize='none' 
                keyboardType='numeric' 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput 
                style={styles.input} 
                value={updatedData.description} 
                onChangeText={(text) => setUpdatedData({ ...updatedData, description: text })} 
                autoCapitalize='none' 
                multiline 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Search Radius (km)</Text>
              <TextInput 
                style={styles.input} 
                value={updatedData.search_radius_km.toString()} 
                onChangeText={(text) => setUpdatedData({ ...updatedData, search_radius_km: text })} 
                keyboardType='numeric' 
                autoCapitalize='none' 
              />
            </View>

            <Button title='Update Party' onPress={handleUpdate} color='#2563EB' />
          </>
        ) : (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}><Text style={styles.label}>Name:</Text> {partyData.missing_person.name}</Text>
            <Text style={styles.infoText}><Text style={styles.label}>Age:</Text> {partyData.missing_person.age}</Text>
            <Text style={styles.infoText}><Text style={styles.label}>Description:</Text> {partyData.missing_person.description}</Text>
            <Text style={styles.infoText}><Text style={styles.label}>Search Radius:</Text> {partyData.search_radius_km} km</Text>
          </View>
        )}
        <Button title='Leave Party' onPress={handleLeaveParty} color='red' />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15, color: '#1E3A8A' },
  joinCode: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  joinCodeText: { color: '#2563EB' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 5, color: '#333' },
  inputGroup: { width: '90%', marginVertical: 10 },
  inputLabel: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  input: { height: 45, borderColor: '#2563EB', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 15, backgroundColor: '#fff' },
  infoContainer: { alignSelf: 'stretch', paddingHorizontal: 20 },
  infoText: { fontSize: 18, marginBottom: 10, color: '#333' },
  label: { fontWeight: 'bold', color: '#1E3A8A' },
  loading: { marginTop: 50 },
  error: { fontSize: 18, color: 'red' },
  image: { width: 150, height: 150, marginVertical: 20, borderRadius: 10 },
});
