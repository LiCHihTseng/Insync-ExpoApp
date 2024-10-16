import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Image,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import Background from "../Background";
import { useFocusEffect } from "@react-navigation/native"; //https://reactnavigation.org/docs/use-focus-effect/
import AsyncStorage from "@react-native-async-storage/async-storage"; //https://react-native-async-storage.github.io/async-storage/docs/usage/
import Ionicons from "@expo/vector-icons/Ionicons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
interface EventData {
  event_id: number;
  event_name: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string;
  privacy: string;
  story: string | null;
  repeat_event: string;
}

export default function Events(): JSX.Element {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const TextColor = colorScheme === "dark" ? "#000000" : "#000000";
  const [userId, setUserId] = useState<string | null>(null);

  //fetch userId from AsyncStorage
  useEffect(() => {
    const getUserId = async () => {
      try {
        const id = await AsyncStorage.getItem("user_id");
        if (id !== null) {
          setUserId(id);
        } else {
          console.error("No user_id found in AsyncStorage");
          setLoading(false); //stop loading if user_id is not found
        }
      } catch (error) {
        console.error("Error retrieving user_id:", error);
        setLoading(false);
      }
    };

    getUserId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchEventData = async () => {
        if (userId !== null) {
          try {
            setLoading(true);

            const response = await fetch(
              `https://deco3801-foundjesse.uqcloud.net/restapi/event.php?user=${userId}`
            );
            if (!response.ok) {
              console.error("HTTP error:", response.status);
              setLoading(false);
              return;
            }
            const data = await response.json();
            if (Array.isArray(data)) {
              //get current date and time
              const now = new Date();

              //filter out past events
              const upcomingEvents = data.filter((event: EventData) => {
                const eventEndTime = new Date(event.end_time);
                return eventEndTime >= now;
              });

              //remove duplicate events based on event_id
              const uniqueEvents = removeDuplicateEvents(upcomingEvents);
              console.log("Fetched events:", uniqueEvents);
              setEvents(uniqueEvents);
            } else {
              console.error("Invalid data format:", data);
            }
          } catch (error) {
            console.error("Fetch error:", error);
          } finally {
            setLoading(false);
          }
        }
      };
      fetchEventData();
    }, [userId]) //whenever userId changes, useCallback will recreate the callback function. (run it back)
  );

  const removeDuplicateEvents = (events: EventData[]): EventData[] => {
    const uniqueEventMap = new Map<number, EventData>();
    events.forEach((event) => {
      if (!uniqueEventMap.has(event.event_id)) {
        //for each event check if the same id already exist in the uniqueEventMap
        uniqueEventMap.set(event.event_id, event);
      }
    });
    return Array.from(uniqueEventMap.values());
  };

  const handleDelete = async (eventId: number) => {
    //confirm deletion
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        {
          text: "Cancel",
          style: "cancel", //https://reactnative.dev/docs/alert
        },
        {
          text: "Delete",
          style: "destructive", //https://reactnative.dev/docs/alert
          onPress: () => deleteEvent(eventId),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(
        `https://deco3801-foundjesse.uqcloud.net/restapi/event.php`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ event_id: eventId }),
        }
      );

      if (response.ok) {
        Alert.alert("Success", "Event deleted successfully!");
        //remove the deleted event from the state
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.event_id !== eventId)
        ); //get the previous events(prevEvents) then filter it without the eventId thats being deleted
      } else {
        const errorData = await response.json();
        console.error("Delete error:", errorData);
        Alert.alert(
          "Error",
          errorData.message || "Failed to delete the event."
        );
      }
    } catch (error) {
      console.error("Network error:", error);
      Alert.alert("Error", "An error occurred while deleting the event.");
    }
  };

  return (
    <View style={styles.container}>
      <Background />
      <View style={styles.headerWrapper}>
        <Pressable
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="white" />
          <Text style={styles.backText}>Events</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : events.length > 0 ? (
          events.map((event) => (
            <Pressable
              key={event.event_id}
              style={[
                styles.EventContainer,
                {
                  height: 150,
                  width: "80%",
                  borderRadius: 10,
                  overflow: "hidden",
                  marginTop: 20,
                  alignSelf: "center",
                },
              ]}
            >
              <View style={styles.eventContent}>
                <View style={styles.textContainer}>
                  <Text style={[styles.eventName, { color: TextColor }]}>
                    {event.event_name}
                  </Text>
                  <Text style={[styles.eventDetails, { color: TextColor }]}>
                    Start: {event.start_time}
                  </Text>
                  <Text style={[styles.eventDetails, { color: TextColor }]}>
                    End: {event.end_time}
                  </Text>
                  <Text style={[styles.eventDetails, { color: TextColor }]}>
                    {event.location}
                  </Text>
                  <Text style={[styles.eventDetails, { color: TextColor }]}>
                    {event.description}
                  </Text>
                </View>
                {event.story ? (
                  <Image
                    source={{
                      uri: `https://deco3801-foundjesse.uqcloud.net/uploads/${event.story}`,
                    }}
                    style={styles.eventImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View>
                    <Pressable
                      onPress={() => {
                        router.push({
                          pathname: "./UploadStory",
                          params: { event_id: event.event_id },
                        });
                      }}
                      style={styles.UploadStoryBox}
                    >
                      <Text style={{ textAlign: "center", top: "40%" }}>
                        + Add story
                      </Text>
                    </Pressable>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    router.push({
                      pathname: "./EditEvent",
                      params: { event_id: event.event_id },
                    });
                  }}
                >
                  <Image
                    style={styles.deleteButton}
                    source={require("@/assets/images/editIcon.png")}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(event.event_id)}
                >
                  <Image
                    style={styles.deleteButton}
                    source={require("@/assets/images/deleteIcon.png")}
                  />
                </TouchableOpacity>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.noDataText}>No events found.</Text>
        )}
      </ScrollView>
      <TouchableOpacity
        onPress={() => {
          router.push("/drawer/CreateEvent");
        }}
        style={styles.addButton}
      >
        <FontAwesomeIcon icon={faPlus} size={38} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  UploadStoryBox: {
    marginRight: 10,
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 5,
    borderColor: "#E0E0E0",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
    marginTop: 20,
    zIndex: 1,
  },
  EventContainer: {
    backgroundColor: "#FFFFFF",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
    position: "relative",
  },
  eventContent: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  eventImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
  },
  eventImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  eventDetails: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    position: "absolute",
    top: 50,
    right: 10,
    width: 36,
    height: 36,
  },
  editButton: {
    position: "absolute",
    top: 50,
    right: 75,
    width: 36,
    height: 36,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5081FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 2,
  },
  headerWrapper: {
    position: "static",
    zIndex: 1,
  },
  backButton: {
    flexDirection: "row",
    marginLeft: 20,
    marginTop: 40,
    alignItems: "center",
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  backText: {
    color: "#EFF3FF",
    fontWeight: "bold",
    fontSize: 25,
    marginLeft: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
  },
  noDataText: {
    marginTop: 20,
    fontSize: 18,
  },
});
