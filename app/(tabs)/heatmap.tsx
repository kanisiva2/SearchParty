import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, doc, setDoc, getDocs, query, orderBy, limit, Timestamp, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useLocalSearchParams } from 'expo-router';

export default function SearchTab() {
  const { partyId } = useLocalSearchParams();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [otherUsers, setOtherUsers] = useState<Record<string, any>[]>([]);
  const [locationHistory, setLocationHistory] = useState<Array<{
    userId: string;
    latitude: number;
    longitude: number;
    timestamp: number;
  }>>([]);
  const [zoom, setZoom] = useState(0.05);
  const [radius, setRadius] = useState(5); // Set default search radius
  const [loading, setLoading] = useState(true);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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
          
          // Add to location history
          await addLocationToHistory(coords);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchUserLocation();
    
    // Set up interval to update location every 15 seconds
    if (!locationInterval.current && partyId && typeof partyId === 'string') {
      locationInterval.current = setInterval(fetchUserLocation, 15000);
    }
    
    // Clean up interval on unmount
    return () => {
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
    };
  }, [partyId]);

  // Function to add location to history
  const addLocationToHistory = async (coords: { latitude: number; longitude: number }) => {
    if (!partyId || typeof partyId !== 'string' || !auth.currentUser) return;
    
    try {
      const currentTime = Date.now();
      const historyRef = doc(
        db, 
        'search_parties', 
        partyId, 
        'location_history', 
        `${auth.currentUser.uid}_${currentTime}`
      );
      
      await setDoc(historyRef, {
        userId: auth.currentUser.uid,
        ...coords,
        timestamp: currentTime
      });
    } catch (error) {
      console.error('Error adding location to history:', error);
    }
  };

  // Fetch other users' locations from Firestore
  useEffect(() => {
    const fetchOtherUsers = async () => {
      if (!partyId || typeof partyId !== 'string') return;
      try {
        const q = query(collection(db, 'search_parties', String(partyId), 'live_locations'));
        const querySnapshot = await getDocs(q);
        const locations = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          userId: doc.id
        }));
        setOtherUsers(locations);
      } catch (error) {
        console.error('Error fetching other users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOtherUsers();
    
    // Set up interval to fetch other users' locations every 15 seconds
    const otherUsersInterval = setInterval(fetchOtherUsers, 15000);
    
    return () => {
      clearInterval(otherUsersInterval);
    };
  }, [partyId]);

  // Fetch location history for all users in the party
  useEffect(() => {
    const fetchLocationHistory = async () => {
      if (!partyId || typeof partyId !== 'string') return;
      
      try {
        // Get data from the past hour
        const oneHourAgo = Date.now() - 3600000;
        
        const historyCollection = collection(db, 'search_parties', String(partyId), 'location_history');
        const q = query(
          historyCollection,
          where('timestamp', '>=', oneHourAgo),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => doc.data() as {
          userId: string;
          latitude: number;
          longitude: number;
          timestamp: number;
        });
        
        setLocationHistory(history);
      } catch (error) {
        console.error('Error fetching location history:', error);
      }
    };
    
    fetchLocationHistory();
    
    // Set up interval to fetch location history every 30 seconds
    const historyInterval = setInterval(fetchLocationHistory, 30000);
    
    return () => {
      clearInterval(historyInterval);
    };
  }, [partyId]);

  // Calculate opacity based on how recent the location data is
  const getOpacityFromTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp; // Difference in milliseconds
    
    // For locations within the last hour
    const maxAge = 3600000; // 1 hour in milliseconds
    
    if (diff > maxAge) return 0;
    
    // Scale from 0.1 to 0.8 based on age
    // More recent = more opaque
    return 0.8 - (diff / maxAge) * 0.7;
  };

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
        {/* Current User Location */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={30} // Small radius for the current location
            strokeColor="rgba(255, 0, 0, 0.8)"
            fillColor="rgba(255, 0, 0, 0.8)"
            zIndex={10}
          />
        )}
        
        {/* Location History Heatmap */}
        {locationHistory.map((location, index) => (
          <Circle
            key={`history-${location.userId}-${location.timestamp}`}
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={20} // Smaller radius for history points
            strokeColor={`rgba(255, 0, 0, ${getOpacityFromTimestamp(location.timestamp)})`}
            fillColor={`rgba(255, 0, 0, ${getOpacityFromTimestamp(location.timestamp)})`}
            zIndex={5}
          />
        ))}

        {/* Other Users' Current Locations */}
        {otherUsers.filter(user => user.userId !== auth.currentUser?.uid).map((user, index) => (
          <Circle
            key={`user-${user.userId}`}
            center={{ latitude: user.latitude, longitude: user.longitude }}
            radius={30}
            strokeColor="rgba(0, 128, 255, 0.8)"
            fillColor="rgba(0, 128, 255, 0.8)"
            zIndex={9}
          />
        ))}

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
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 0, 0, 0.8)' }]} />
          <Text style={styles.legendText}>You</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(0, 128, 255, 0.8)' }]} />
          <Text style={styles.legendText}>Other searchers</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 0, 0, 0.4)' }]} />
          <Text style={styles.legendText}>Recently visited areas</Text>
        </View>
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
    bottom: 80,
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
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 5,
    padding: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
});