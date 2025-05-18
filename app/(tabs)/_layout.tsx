import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const partyId = params?.partyId ? String(params.partyId) : null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          headerRight: () => (
            <Link href="/Settings" asChild>
              <Pressable>
                {({ pressed }) => (
                  <AntDesign
                    name="setting"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
        initialParams={{ partyId }}
      />
      <Tabs.Screen
        name="heatmap"
        options={{
          title: 'HeatMap',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
          headerRight: () => (
            <Link href="/Settings" asChild>
              <Pressable>
                {({ pressed }) => (
                  <AntDesign
                    name="setting"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
        initialParams={{ partyId }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
          headerRight: () => (
            <Link href="/Settings" asChild>
              <Pressable>
                {({ pressed }) => (
                  <AntDesign
                    name="setting"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
        initialParams={{ partyId }}
      />
      <Tabs.Screen
        name="partyInfo"
        options={{
          title: 'Party Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          headerRight: () => (
            <Link href="/Settings" asChild>
              <Pressable>
                {({ pressed }) => (
                  <AntDesign
                    name="setting"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
        initialParams={{ partyId }}
      />
    </Tabs>
  );
}