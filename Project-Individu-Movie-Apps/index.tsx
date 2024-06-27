import React, { createContext, useContext, useState, useEffect } from "react"
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { RouteProp } from "@react-navigation/native"
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  TextInput,
  Button,
  Animated,
  Easing,
} from "react-native"
import axios from "axios"
import Icon from "react-native-vector-icons/Ionicons"
import FontAwesome from "react-native-vector-icons/FontAwesome"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated"

// Type definitions
type RootStackParamList = {
  Home: undefined
  Detail: { movie: Movie }
  Search: undefined
  Favorites: undefined
}

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">
type DetailScreenRouteProp = RouteProp<RootStackParamList, "Detail">

interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  vote_average: number
  popularity: number
  original_language: string
  release_date: string
  vote_count: number
}

// TMDB API details
const API_KEY = "f5817ca812a95ce0e0ab07166bfc9fe5" // Ganti dengan API key dari TMDb
const BASE_URL = "https://api.themoviedb.org/3/movie"
const SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

// Fetch movies from TMDB
const fetchMovies = async (endpoint: string) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/${endpoint}?api_key=${API_KEY}&language=en-US&page=1`
    )
    return response.data.results
  } catch (error) {
    console.error("Error fetching movies:", error)
    return []
  }
}

const fetchMovieRecommendations = async (movieId: number) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/${movieId}/recommendations?api_key=${API_KEY}&language=en-US&page=1`
    )
    return response.data.results
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return []
  }
}

// Context for favorites
const FavoritesContext = createContext<{
  favorites: Movie[]
  addFavorite: (movie: Movie) => void
  removeFavorite: (movieId: number) => void
  isFavorite: (movieId: number) => boolean
}>({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
})

const FavoritesProvider: React.FC = ({ children }) => {
  const [favorites, setFavorites] = useState<Movie[]>([])

  useEffect(() => {
    loadFavoritesFromStorage()
  }, [])

  const loadFavoritesFromStorage = async () => {
    const storedFavorites = await loadFavorites()
    setFavorites(storedFavorites)
  }

  const saveFavorites = async (favorites: Movie[]) => {
    try {
      const jsonValue = JSON.stringify(favorites)
      await AsyncStorage.setItem("@favorites", jsonValue)
    } catch (error) {
      console.error("Error saving favorites:", error)
    }
  }

  const loadFavorites = async (): Promise<Movie[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem("@favorites")
      return jsonValue ? JSON.parse(jsonValue) : []
    } catch (error) {
      console.error("Error loading favorites:", error)
      return []
    }
  }

  const addFavorite = async (movie: Movie) => {
    const newFavorites = [...favorites, movie]
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  const removeFavorite = async (movieId: number) => {
    const newFavorites = favorites.filter((movie) => movie.id !== movieId)
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  const isFavorite = (movieId: number): boolean => {
    return favorites.some((movie) => movie.id === movieId)
  }

  return (
    <FavoritesContext.Provider
      value={{ favorites, addFavorite, removeFavorite, isFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

const useFavorites = () => useContext(FavoritesContext)

// MovieItem Component with Animation
const MovieItem: React.FC<{ movie: Movie; onPress: () => void }> = ({
  movie,
  onPress,
}) => {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 100 })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 })
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.itemContainer, animatedStyle]}>
        <ImageBackground
          source={{ uri: `${IMAGE_BASE_URL}${movie.poster_path}` }}
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay}>
            <Text style={styles.title}>{movie.title}</Text>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="yellow" />
              <Text style={styles.rating}>{movie.vote_average.toFixed(1)}</Text>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    </TouchableOpacity>
  )
}

// Home Screen with Animation
const HomeScreen: React.FC<{ navigation: HomeScreenNavigationProp }> = ({
  navigation,
}) => {
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([])
  const [popular, setPopular] = useState<Movie[]>([])
  const [topRated, setTopRated] = useState<Movie[]>([])
  const [upcoming, setUpcoming] = useState<Movie[]>([])

  useEffect(() => {
    const fetchAllMovies = async () => {
      setNowPlaying(await fetchMovies("now_playing"))
      setPopular(await fetchMovies("popular"))
      setTopRated(await fetchMovies("top_rated"))
      setUpcoming(await fetchMovies("upcoming"))
    }

    fetchAllMovies()
  }, [])

  const renderMovies = (movies: Movie[], title: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={movies}
        renderItem={({ item }) => (
          <MovieItem
            movie={item}
            onPress={() => navigation.navigate("Detail", { movie: item })}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  )

  return (
    <ScrollView style={styles.container}>
      {renderMovies(nowPlaying, "Now Playing")}
      {renderMovies(popular, "Popular")}
      {renderMovies(topRated, "Top Rated")}
      {renderMovies(upcoming, "Upcoming")}
    </ScrollView>
  )
}

// Detail Screen with Animation
const DetailScreen: React.FC<{
  route: DetailScreenRouteProp
  navigation: any
}> = ({ route, navigation }) => {
  const { movie } = route.params
  const { addFavorite, removeFavorite, isFavorite } = useFavorites()
  const [isInFavorites, setIsInFavorites] = useState(false)
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const opacity = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(opacity.value, {
        duration: 1000,
        easing: Easing.ease,
      }),
    }
  })

  useEffect(() => {
    opacity.value = 1
    setIsInFavorites(isFavorite(movie.id))
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    const recommendations = await fetchMovieRecommendations(movie.id)
    setRecommendations(recommendations)
  }

  const toggleFavorite = () => {
    if (isInFavorites) {
      removeFavorite(movie.id)
      setIsInFavorites(false)
    } else {
      addFavorite(movie)
      setIsInFavorites(true)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View style={animatedStyle}>
        <ImageBackground
          source={{ uri: `${IMAGE_BASE_URL}${movie.backdrop_path}` }}
          style={styles.detailImage}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay}>
            <Text style={styles.title}>{movie.title}</Text>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="yellow" />
              <Text style={styles.rating}>{movie.vote_average.toFixed(1)}</Text>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
      <View style={styles.detailInfo}>
        <Text style={styles.infoText}>
          Original Language: {movie.original_language}
        </Text>
        <Text style={styles.infoText}>Release Date: {movie.release_date}</Text>
        <Text style={styles.infoText}>Popularity: {movie.popularity}</Text>
        <Text style={styles.infoText}>Vote Count: {movie.vote_count}</Text>
        <Text style={styles.overview}>{movie.overview}</Text>
      </View>
      <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
        <Icon
          name={isInFavorites ? "heart" : "heart-outline"}
          size={24}
          color="#ff6347"
        />
        <Text style={styles.favoriteText}>
          {isInFavorites ? "Remove from Favorites" : "Add to Favorites"}
        </Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Recommended Movies</Text>
      <FlatList
        horizontal
        data={recommendations}
        renderItem={({ item }) => (
          <MovieItem
            movie={item}
            onPress={() => navigation.navigate("Detail", { movie: item })}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </ScrollView>
  )
}

// Search Screen with Animation
const SearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Movie[]>([])

  const handleSearch = async () => {
    try {
      const response = await axios.get(
        `${SEARCH_URL}?api_key=${API_KEY}&query=${query}`
      )
      setResults(response.data.results)
    } catch (error) {
      console.error("Error searching movies:", error)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for movies..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />
      <FlatList
        data={results}
        renderItem={({ item }) => (
          <MovieItem
            movie={item}
            onPress={() => navigation.navigate("Detail", { movie: item })}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  )
}

// Favorites Screen with Animation
const FavoritesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { favorites, removeFavorite } = useFavorites()

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Favorite Movies</Text>
      <FlatList
        horizontal
        data={favorites}
        renderItem={({ item }) => (
          <View>
            <FlatList
              horizontal
              data={favorites}
              renderItem={({ item }) => (
                <MovieItem
                  movie={item}
                  onPress={() => navigation.navigate("Detail", { movie: item })}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
            />
            <TouchableOpacity
              onPress={() => removeFavorite(item.id)}
              style={styles.favoriteButton}
            >
              <Icon name="trash-outline" size={24} color="#ff6347" />
              <Text style={styles.favoriteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </ScrollView>
  )
}

// Navigation setup
const Stack = createStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator()

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: "Movies" }}
    />
    <Stack.Screen
      name="Detail"
      component={DetailScreen}
      options={{ title: "Movie Detail" }}
    />
  </Stack.Navigator>
)

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{ title: "Search Movies" }}
    />
    <Stack.Screen
      name="Detail"
      component={DetailScreen}
      options={{ title: "Movie Detail" }}
    />
  </Stack.Navigator>
)

const FavoritesStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ title: "Favorite Movies" }}
    />
    <Stack.Screen
      name="Detail"
      component={DetailScreen}
      options={{ title: "Movie Detail" }}
    />
  </Stack.Navigator>
)

const App: React.FC = () => {
  return (
    <FavoritesProvider>
      <Tab.Navigator>
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <Icon name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStack}
          options={{
            tabBarLabel: "Search",
            tabBarIcon: ({ color, size }) => (
              <Icon name="search-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Favorites"
          component={FavoritesStack}
          options={{
            tabBarLabel: "Favorites",
            tabBarIcon: ({ color, size }) => (
              <Icon name="heart-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </FavoritesProvider>
  )
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e1c19b", // Background color: HEX #e1c19b
    padding: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2f3d53", // Section title color: HEX #2f3d53
  },
  itemContainer: {
    marginRight: 15,
    marginBottom: 20,
    width: 150,
    height: 225,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff", // White background for movie items
    borderWidth: 1,
    borderColor: "#c84843", // Border color: HEX #c84843
    elevation: 5, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 }, // Shadow for iOS
    shadowOpacity: 0.8, // Shadow for iOS
    shadowRadius: 2, // Shadow for iOS
  },
  imageBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },
  imageStyle: {
    borderRadius: 10,
  },
  overlay: {
    backgroundColor: "rgba(109, 32, 28, 0.6)", // Overlay color with opacity: HEX #6d201c
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff", // White color for movie titles
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  rating: {
    marginLeft: 5,
    color: "yellow", // Rating color: Yellow
    fontSize: 16,
  },
  detailContainer: {
    padding: 10,
  },
  detailImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: "flex-end",
  },
  popularity: {
    fontSize: 16,
    marginVertical: 5,
    color: "#333", // Popularity text color: Dark gray
  },
  overview: {
    fontSize: 16,
    marginTop: 10,
    color: "#333", // Overview text color: Dark gray
  },
  input: {
    borderWidth: 1,
    borderColor: "#949054", // Border color: HEX #949054
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff", // White background for input
    color: "#333", // Dark gray text color for input
  },
  listContainer: {
    paddingLeft: 10,
  },
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    padding: 10,
    backgroundColor: "#ffffff", // White background for favorite button
    borderRadius: 5,
    borderColor: "#c84843", // Border color: HEX #c84843
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  favoriteText: {
    marginLeft: 5,
    color: "#c84843", // Text color: HEX #c84843
  },
  detailInfo: {
    backgroundColor: "#ffffff", // White background for detail info
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#a4a4cc", // Border color: HEX #a4a4cc
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#2f3d53", // Text color: HEX #2f3d53
  },
})

export default App
