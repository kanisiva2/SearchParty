import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function PartyInfo() {
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
  const [uploadingImage, setUploadingImage] = useState(false);

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
    if (!partyId) return;
    try {
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
    Alert.alert(
      "Leave Party",
      "Are you sure you want to leave this search party?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!partyId) return;
            try {
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
          }
        }
      ]
    );
  };

  const handlePickImage = async () => {
    if (!isCreator || !partyId) return;
    try {
      setUploadingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        await updateDoc(doc(db, 'search_parties', partyId), {
          'missing_person.image_url': uri,
        });
        setPartyData(prev =>
          prev
            ? {
                ...prev,
                missing_person: {
                  ...prev.missing_person,
                  image_url: uri,
                },
              }
            : prev
        );
        Alert.alert('Success', 'Image updated!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#5C6BC0' />
        <Text style={styles.loadingText}>Loading party information...</Text>
      </SafeAreaView>
    );
  }
  if (!partyId) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>No party selected</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  if (!partyData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Party not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Share code */}
        <View style={styles.headerContainer}>
          <View style={styles.joinCodeContainer}>
            <Text style={styles.joinCodeLabel}>Share Code</Text>
            <Text style={styles.joinCodeText}>{partyData.party_code}</Text>
          </View>
        </View>

        {/* Image (always editable by creator) */}
        <View style={styles.imageContainer}>
          {uploadingImage ? (
            <ActivityIndicator size="large" color="#5C6BC0" />
          ) : isCreator ? (
            <TouchableOpacity onPress={handlePickImage} style={{ borderRadius: 12, overflow: 'hidden' }}>
              {partyData.missing_person.image_url ? (
                <Image source={{ uri: partyData.missing_person.image_url }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderText}>No Image Available</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : partyData.missing_person.image_url ? (
            <Image source={{ uri: partyData.missing_person.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
        </View>

        {/* Missing Person Details */}
        {isCreator ? (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Missing Person Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={updatedData.name}
                onChangeText={text => setUpdatedData({ ...updatedData, name: text })}
                autoCapitalize='words'
                placeholder="Enter name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={updatedData.age}
                onChangeText={text => setUpdatedData({ ...updatedData, age: text })}
                keyboardType='numeric'
                placeholder="Enter age"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={updatedData.description}
                onChangeText={text => setUpdatedData({ ...updatedData, description: text })}
                multiline
                numberOfLines={4}
                placeholder="Enter description (clothing, last seen location, etc.)"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Search Radius (km)</Text>
              <TextInput
                style={styles.input}
                value={updatedData.search_radius_km.toString()}
                onChangeText={text => setUpdatedData({ ...updatedData, search_radius_km: text })}
                keyboardType='numeric'
                placeholder="Enter search radius in km"
              />
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
              <Text style={styles.buttonText}>Update Information</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Missing Person Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{partyData.missing_person.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{partyData.missing_person.age}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoValue}>{partyData.missing_person.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Search Radius</Text>
              <Text style={styles.infoValue}>{partyData.search_radius_km} km</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveParty}>
          <Text style={styles.leaveButtonText}>Leave Party</Text>
        </TouchableOpacity>
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8EB',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A237E',
    marginBottom: 10,
  },
  joinCodeContainer: {
    backgroundColor: '#E8EAF6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 20,
    marginVertical: 10,
    alignItems: 'center',
    width: width * 0.9,
  },
  joinCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6BC0',
    marginBottom: 4,
  },
  joinCodeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3F51B5',
    letterSpacing: 1.5,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    backgroundColor: '#E1E2E6',
  },
  imagePlaceholder: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    backgroundColor: '#E1E2E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9E9E9E',
    fontSize: 16,
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3F51B5',
    marginVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#424242',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  updateButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#7986CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    shadowColor: '#9E9E9E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 18,
    color: '#212121',
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF5350',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  leaveButtonText: {
    color: '#EF5350',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#5C6BC0',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF5350',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#5C6BC0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});