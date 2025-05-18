import { StyleSheet, TouchableOpacity, Text, View, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function SettingsScreen() {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    locationSharing: false,
  });

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) {
      router.replace('../login');
    } else {
      const fetchUserData = async () => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userInfo = userDoc.data();
          setUserData({
            name: userInfo.name,
            email: userInfo.email,
            locationSharing: userInfo.location_sharing,
          });
        }
      };
      fetchUserData();
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('../login');
    } catch (error) {
      console.error('Sign out error: ', error);
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    const user = getAuth().currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          location_sharing: value,
        });
        setUserData((prevState) => ({
          ...prevState,
          locationSharing: value,
        }));
      } catch (error) {
        console.error('Error updating location sharing:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Settings</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.info}>{userData.name}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.info}>{userData.email}</Text>
        <Text style={styles.label}>Location Sharing:</Text>
        <Switch
          value={userData.locationSharing}
          onValueChange={handleLocationToggle}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.text}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A237E',
    marginBottom: 40,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  info: {
    fontSize: 18,
    marginBottom: 20,
    color: '#555',
  },
  button: {
    width: '90%',
    backgroundColor: '#5C6BC0',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
