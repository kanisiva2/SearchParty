import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function CreateParty() {
  const [location, setLocation] = useState({ latitude: 38.8977, longitude: -77.0365 });
  const [radius, setRadius] = useState(5);
  const [zoom, setZoom] = useState(0.05);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().location_sharing) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createSearchParty = async () => {
    if (!name || !age || !description) {
      Alert.alert('Error', 'Please fill out all fields.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    try {
      const partyCode = generateJoinCode();
      const docRef = await addDoc(collection(db, 'search_parties'), {
        creator_id: user.uid,
        start_location: location,
        search_radius_km: radius,
        missing_person: { name, age, description, image_url: imageUri },
        participants: [user.uid],
        party_code: partyCode,
      });
      Alert.alert('Success', `Party created! Join code: ${partyCode}`);
      router.replace({ pathname: '/(tabs)/partyInfo', params: { partyId: docRef.id } });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not create search party.');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}

        {/* Location + Radius Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Start Location & Radius</Text>
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={{ ...location, latitudeDelta: zoom, longitudeDelta: zoom }}
              onPress={e => setLocation(e.nativeEvent.coordinate)}
            >
              <Marker coordinate={location} />
              <Circle center={location} radius={radius * 1000} strokeColor="rgba(0,0,255,0.5)" fillColor="rgba(0,0,255,0.2)" />
            </MapView>
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.max(zoom / 1.2, 0.005))}>
                <Text style={styles.zoomText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.min(zoom * 1.2, 0.5))}>
                <Text style={styles.zoomText}>–</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.subTitle}>Search Radius: {radius} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={radius}
            onValueChange={setRadius}
          />
        </View>

        {/* Missing Person Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Missing Person Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter age"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter description"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Photo</Text>
            {imageUri ? (
              <TouchableOpacity onPress={pickImage}>
                <Image source={{ uri: imageUri }} style={styles.photo} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={pickImage}>
                <Text style={styles.placeholderText}>Tap to add image</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity style={styles.primaryButton} onPress={createSearchParty}>
          <Text style={styles.primaryButtonText}>Create Party</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 20,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3F51B5',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#455A64',
    marginTop: 16,
    marginBottom: 8,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  zoomButton: {
    padding: 8,
    alignItems: 'center',
  },
  zoomText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3F51B5',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#455A64',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  photo: {
    width: width * 0.8,
    height: width * 0.5,
    borderRadius: 8,
    backgroundColor: '#E1E2E6',
  },
  photoPlaceholder: {
    width: width * 0.8,
    height: width * 0.5,
    borderRadius: 8,
    backgroundColor: '#E1E2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#757575',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#7986CB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});