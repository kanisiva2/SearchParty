import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, doc, setDoc, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useLocalSearchParams } from 'expo-router';

export default function SearchTab() {
  const { partyId } = useLocalSearchParams();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [otherUsers, setOtherUsers] = useState<Record<string, any>[]>([]);
  const [zoom, setZoom] = useState(0.05);
  const [radius, setRadius] = useState(5); // Set default search radius
  const [loading, setLoading] = useState(true);

  // Fetch user location when the component mounts
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('Location permission denied');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(coords);

        // Update Firestore with the user's location
        if (partyId && typeof partyId === 'string' && auth.currentUser) {
          const userRef = doc(db, 'search_parties', partyId, 'live_locations', auth.currentUser.uid);
          await setDoc(userRef, { ...coords, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchUserLocation();
  }, [partyId]);

  // Fetch other users' locations from Firestore
  useEffect(() => {
    const fetchOtherUsers = async () => {
      if (!partyId || typeof partyId !== 'string') return;
      try {
        const q = query(collection(db, 'search_parties', String(partyId), 'live_locations'));
        const querySnapshot = await getDocs(q);
        const locations = querySnapshot.docs.map((doc) => doc.data());
        setOtherUsers(locations);
      } catch (error) {
        console.error('Error fetching other users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOtherUsers();
  }, [partyId]);

  // Show loading indicator while data is being fetched
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: userLocation?.latitude || 37.78825, // Default location if user location is null
          longitude: userLocation?.longitude || -122.4324, // Default location if user location is null
          latitudeDelta: zoom,
          longitudeDelta: zoom,
        }}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={30} // Small radius for the gradient circle
            strokeColor="rgba(255, 0, 0, 0.5)"
            fillColor="rgba(255, 0, 0, 0.6)"
            zIndex={10}
          />
        )}
        {/* {userLocation && (
          <Circle
            center={userLocation}
            radius={30} // Small radius for the gradient circle
            strokeColor="rgba(255, 0, 0, 0.5)"
            fillColor="rgba(255, 0, 0, 0.6)"
            zIndex={10}
          />
        )} */}
        {/* {otherUsers.map((user, index) => (
          <Marker key={index} coordinate={{ latitude: user.latitude, longitude: user.longitude }} title="Other User" />
        ))} */}

        {/* Blue circle for search radius */}
        <Circle
          center={userLocation || { latitude: 37.78825, longitude: -122.4324 }}  // Use user location or default
          radius={radius * 1000}  // Convert radius to meters
          strokeColor="rgba(0, 0, 255, 0.5)"
          fillColor="rgba(0, 0, 255, 0.2)"
        />
      </MapView>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.max(zoom / 1.2, 0.005))}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={() => setZoom(Math.min(zoom * 1.2, 0.5))}>
          <Text style={styles.zoomText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
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
  zoomText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
