import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import uuid from 'react-native-uuid';

const CreateParty = () => {
  const [location, setLocation] = useState({ latitude: 38.8977, longitude: -77.0365 });
  const [radius, setRadius] = useState(5);
  const [zoom, setZoom] = useState(0.05);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().location_sharing) {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Location access is needed to set your default search location.');
            return;
          }
          let userLocation = await Location.getCurrentPositionAsync({});
          setLocation({
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchUserLocation();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
  
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const generateJoinCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };  

  const createSearchParty = async () => {
    if (!name || !age || !description) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }
  
      const partyCode = generateJoinCode();  // Generate a short 4-character join code
      const docRef = await addDoc(collection(db, 'search_parties'), {
        creator_id: user.uid,
        start_location: location,
        search_radius_km: radius,
        missing_person: { name, age, description, image_url: imageUri },
        participants: [user.uid],
        party_code: partyCode,  // Save the party code to Firestore
      });
  
      Alert.alert('Success', `Party created! Join code: ${partyCode}`);
      router.replace({ pathname: "/(tabs)/partyInfo", params: { partyId: docRef.id, partyCode } });
  
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not create search party.');
    }
  };  

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Search Party</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{ ...location, latitudeDelta: zoom, longitudeDelta: zoom }}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)}
          >
            <Marker coordinate={location} title="Start Location" />
            <Circle
              center={location}
              radius={radius * 1000}
              strokeColor="rgba(0, 0, 255, 0.5)"
              fillColor="rgba(0, 0, 255, 0.2)"
            />
          </MapView>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.max(zoom / 1.2, 0.005))}>
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.min(zoom * 1.2, 0.5))}>
              <Text style={styles.zoomText}>-</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text>Search Radius: {radius} km</Text>
        <Slider
          style={{ width: '90%', height: 40 }}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={radius}
          onValueChange={setRadius}
        />
        <TextInput autoCapitalize="none" style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput autoCapitalize="none" style={styles.input} placeholder="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
        <TextInput autoCapitalize="none" style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline />
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <Button title="Pick Image" onPress={pickImage} />
        <Button title="Create Party" onPress={createSearchParty} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  mapContainer: { width: '100%', height: 300, position: 'relative' },
  map: { width: '100%', height: '100%' },
  zoomControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  zoomButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  zoomText: { fontSize: 18, fontWeight: 'bold' },
  input: { width: '90%', height: 40, borderColor: 'gray', borderWidth: 1, marginVertical: 10, paddingHorizontal: 10 },
  image: { width: 100, height: 100, marginVertical: 10 },
});

export default CreateParty;
