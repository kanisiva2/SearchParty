import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  FlatList, 
  StyleSheet, 
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
  const { partyId } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [partyName, setPartyName] = useState<string>("Search Party");
  const [formValue, setFormValue] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return unsubscribe;
  }, []);

  // Subscribe to chat messages for the specific search party
  useEffect(() => {
    if (!user || !partyId || typeof partyId !== 'string') return;

    // Create a reference to the 'messages' subcollection within the specific search party
    const messagesQuery = query(
      collection(db, 'search_parties', partyId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Scroll to bottom when new messages arrive
      if (msgs.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return unsubscribe;
  }, [user, partyId]);

  // Get party name
  useEffect(() => {
    if (!partyId || typeof partyId !== 'string') return;

    const fetchPartyName = async () => {
      try {
        const docRef = doc(db, 'search_parties', partyId);
        const partyDoc = await getDoc(docRef);
        if (partyDoc.exists() && partyDoc.data()?.missing_person?.name) {
          setPartyName(`${partyDoc.data()?.missing_person?.name}'s Search Party`);
        }
      } catch (error) {
        console.error('Error fetching party details:', error);
      }
    };

    fetchPartyName();
  }, [partyId]);

  // Function to send a new message
  const sendMessage = async () => {
    if (formValue.trim() === '' || !user || !partyId || typeof partyId !== 'string') return;
    
    try {
      // Add the message to the 'messages' subcollection of the specific search party
      await addDoc(collection(db, 'search_parties', partyId, 'messages'), {
        text: formValue,
        createdAt: serverTimestamp(),
        uid: user.uid,
        photoURL: user.photoURL || null,
        displayName: user.displayName || 'Anonymous',
      });
      
      setFormValue('');
      // Scroll to the bottom after sending a message
      flatListRef.current?.scrollToEnd({ animated: true });
      // Dismiss keyboard after sending message
      Keyboard.dismiss();
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

  // If no party ID is provided, show an error
  if (!partyId || typeof partyId !== 'string') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No search party selected</Text>
      </View>
    );
  }

  // Render the chat interface
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{partyName}</Text>
        
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.chatContainer}>
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ChatMessage 
                    message={item} 
                    currentUserId={user.uid} 
                  />
                )}
                contentContainerStyle={styles.messagesContainer}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </TouchableWithoutFeedback>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={formValue}
            onChangeText={setFormValue}
            placeholder="Type your message..."
            multiline={true}
            maxLength={500}
            blurOnSubmit={false}
          />
          <Button 
            title="Send" 
            onPress={sendMessage} 
            disabled={!formValue.trim()} 
          />
        </View>
      </View>
    </KeyboardAvoidingView>
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
  
  // Format timestamp if available
  const getFormattedTime = () => {
    if (!message.createdAt) return '';
    const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isCurrentUser ? styles.sent : styles.received,
      ]}
    >
      {!isCurrentUser && (
        <Text style={styles.messageSender}>
          {message.displayName || 'Anonymous'}
        </Text>
      )}
      <Text style={[
        styles.messageText,
        isCurrentUser ? styles.sentText : styles.receivedText
      ]}>
        {message.text}
      </Text>
      <Text style={styles.messageTime}>{getFormattedTime()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    alignSelf: 'center',
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  messageContainer: {
    marginVertical: 5,
    padding: 10,
    borderRadius: 16,
    maxWidth: '80%',
  },
  sent: {
    backgroundColor: '#218AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  received: {
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  sentText: {
    color: 'white',
  },
  receivedText: {
    color: '#333',
  },
  messageSender: {
    fontSize: 12,
    color: '#777',
    marginBottom: 3,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 2,
    opacity: 0.7,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#999',
    fontSize: 16,
  },
});