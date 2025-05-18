import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

export default function TabTwoScreen() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [formValue, setFormValue] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Automatically sign in anonymously if not signed in already
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return unsubscribe;
  }, []);


  // Subscribe to chat messages when a user is available
  useEffect(() => {
    if (user) {
      const messagesQuery = query(
        collection(db, 'messages'),
        orderBy('createdAt'),
        limit(25)
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      });
      return unsubscribe;
    }
  }, [user]);

  // Function to send a new message
  const sendMessage = async () => {
    if (formValue.trim() === '') return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: formValue,
        createdAt: serverTimestamp(),
        uid: user.uid,
        photoURL: user.photoURL || null,
      });
      setFormValue('');
      // Scroll to the bottom after sending a message
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // If the user is not signed in, show a loading message
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Signing in...</Text>
      </View>
    );
  }

  // Render the chat interface (without a sign-out button)
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adarsh's Search Party</Text>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessage message={item} currentUserId={user.uid} />
        )}
        contentContainerStyle={styles.messagesContainer}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={formValue}
          onChangeText={setFormValue}
          placeholder="Type your message..."
        />
        <Button title="Send" onPress={sendMessage} disabled={!formValue.trim()} />
      </View>
    </View>
  );
}

// Component for individual chat messages
function ChatMessage({
  message,
  currentUserId,
}: {
  message: any;
  currentUserId: string;
}) {
  const isCurrentUser = message.uid === currentUserId;
  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.sent : styles.received,
      ]}
    >
      <Text style={styles.messageText}>{message.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 5,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    alignSelf: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
  },
  sent: {
    backgroundColor: '#218AFF',
    alignSelf: 'flex-end',
  },
  received: {
    backgroundColor: '#D3D3D3',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
});
