import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Switch,
  SafeAreaView,
  ScrollView,
  StatusBar
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    locationSharing: false,
  });

  useEffect(() => {
    // Wait for Firebase Auth to initialize, then fetch or create user doc
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userInfo = userDoc.data();
          setUserData({
            name: userInfo.name || user.displayName || '',
            email: userInfo.email || user.email || '',
            locationSharing: userInfo.location_sharing ?? false,
          });
        } else {
          // Create default user doc if missing
          setUserData({
            name: user.displayName || '',
            email: user.email || '',
            locationSharing: false,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    });

    return unsub;
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Sign out error: ', error);
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          await updateDoc(userRef, { location_sharing: value });
        } else {
          await setDoc(userRef, {
            name: user.displayName || 'User',
            email: user.email || 'No email',
            location_sharing: value,
          });
        }

        setUserData((prev) => ({
          ...prev,
          locationSharing: value,
        }));
      } catch (error) {
        console.error('Error updating location sharing:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {userData.name.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{userData.name}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>App Settings</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="location-outline" size={22} color="#4A6572" />
              <Text style={styles.settingLabel}>Location Sharing</Text>
            </View>
            <Switch
              value={userData.locationSharing}
              onValueChange={handleLocationToggle}
              trackColor={{ false: '#E0E0E0', true: '#B0BEC5' }}
              thumbColor={userData.locationSharing ? '#3F51B5' : '#FAFAFA'}
            />
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Account</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={22} color="#F44336" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#263238',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3F51B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#607D8B',
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455A64',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 14,
    color: '#37474F',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    fontSize: 16,
    marginLeft: 14,
    color: '#F44336',
    fontWeight: '500',
  },
});