import React, { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoadingScreen from './src/Screens/LoadingScreen';
import AuthScreen from './src/Screens/AuthScreen';
import OnboardingScreen from './src/Screens/OnboardingScreen';
import TabNavigator from './src/Navigation/TabNavigator';
import MovieDetailScreen from './src/Screens/MovieDetailScreen';

// Wildcard storage keys
import {
  STORAGE_KEY,
  BASELINE_COMPLETE_KEY,
  COMPARISON_COUNT_KEY,
  COMPARISON_PATTERN_KEY,
  SKIPPED_MOVIES_KEY
} from './src/Screens/Wildcard';

const Stack = createStackNavigator();

// AsyncStorage keys
const USER_SESSION_KEY = 'wuvo_user_session';
const USER_DATA_KEY = 'wuvo_user_data';
const USER_SEEN_MOVIES_KEY = 'wuvo_user_seen_movies';
const USER_UNSEEN_MOVIES_KEY = 'wuvo_user_unseen_movies';
const USER_PREFERENCES_KEY = 'wuvo_user_preferences';
const ONBOARDING_COMPLETE_KEY = 'wuvo_onboarding_complete';

// Initial genres mapping
const initialGenres = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

export default function App() {
  // App states
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Movie data
  const [seen, setSeen] = useState([]);
  const [unseen, setUnseen] = useState([]);
  const [genres, setGenres] = useState(initialGenres);

  // Reset wildcard comparison state
  const resetWildcardState = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        BASELINE_COMPLETE_KEY,
        COMPARISON_COUNT_KEY,
        COMPARISON_PATTERN_KEY,
        SKIPPED_MOVIES_KEY
      ]);
      Alert.alert('Reset Complete', 'Comparison data has been reset successfully.');
    } catch (e) {
      Alert.alert('Reset Failed', 'There was a problem resetting comparison data.');
    }
  }, []);

  // Reset all user data
  const resetAllUserData = useCallback(async () => {
    try {
      await resetWildcardState();
      await AsyncStorage.multiRemove([
        USER_SESSION_KEY,
        USER_SEEN_MOVIES_KEY,
        USER_UNSEEN_MOVIES_KEY,
        USER_PREFERENCES_KEY,
        ONBOARDING_COMPLETE_KEY
      ]);
      setSeen([]);
      setUnseen([]);
      setOnboardingComplete(false);
      Alert.alert('Reset Complete', 'All user data has been reset successfully.');
    } catch (e) {
      Alert.alert('Reset Failed', 'There was a problem resetting user data.');
    }
  }, [resetWildcardState]);

  // Save user data to storage
  const saveUserData = useCallback(async () => {
    try {
      await AsyncStorage.setItem(USER_SEEN_MOVIES_KEY, JSON.stringify(seen));
      await AsyncStorage.setItem(USER_UNSEEN_MOVIES_KEY, JSON.stringify(unseen));
      await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify({ isDarkMode }));
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, onboardingComplete.toString());
    } catch (e) {
      console.error('Failed to save user data:', e);
    }
  }, [seen, unseen, isDarkMode, onboardingComplete]);

  // Load user data from storage
  const loadUserData = useCallback(async () => {
    try {
      const savedSeen = await AsyncStorage.getItem(USER_SEEN_MOVIES_KEY);
      const savedUnseen = await AsyncStorage.getItem(USER_UNSEEN_MOVIES_KEY);
      const savedPrefs = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
      const savedOnboarding = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);

      if (savedSeen) setSeen(JSON.parse(savedSeen));
      if (savedUnseen) setUnseen(JSON.parse(savedUnseen));
      if (savedPrefs) setIsDarkMode(JSON.parse(savedPrefs).isDarkMode);
      if (savedOnboarding === 'true') setOnboardingComplete(true);
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  // Handle authentication
  const handleAuthentication = useCallback(async (userData) => {
    // Store session
    const session = {
      id: userData.id || 'user_' + Date.now(),
      name: userData.name || 'User',
      email: userData.email || '',
      timestamp: new Date().toISOString()
    };
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    setUserInfo(session);
    setIsAuthenticated(true);
    setCheckingOnboarding(false);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await saveUserData();
    await AsyncStorage.removeItem(USER_SESSION_KEY);
    setUserInfo(null);
    setIsAuthenticated(false);
    setSeen([]);
    setUnseen([]);
    setDataLoaded(false);
    setCheckingOnboarding(true);
  }, [saveUserData]);

  // Onboarding complete
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setIsDarkMode(m => !m);
  }, []);

  // Add to seen
  const handleAddToSeen = useCallback((movie) => {
    setSeen(prev => [...prev.filter(m => m.id !== movie.id), movie]);
    setUnseen(prev => prev.filter(m => m.id !== movie.id));
  }, []);

  // Add to unseen
  const handleAddToUnseen = useCallback((movie) => {
    setUnseen(prev => [...prev.filter(m => m.id !== movie.id), movie]);
  }, []);

  // Initial app setup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const session = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (session) {
          setUserInfo(JSON.parse(session));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsLoading(false);
        setAppReady(true);
      }
    };
    initializeApp();
  }, []);
  // TEMPORARY: Clear storage on launch RRRRRRRRRRRRRRRRRRRRRIIIIIIIIIIIIIIIIIIIIIIIIIIIGGGGGGGGGGGGGGGGGGGGHT HERE
  useEffect(() => {
    AsyncStorage.clear(); //HERE IS THE STORAGE DUMMY
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (appReady && isAuthenticated && !dataLoaded) {
      loadUserData();
      setCheckingOnboarding(false);
    }
  }, [appReady, isAuthenticated, dataLoaded, loadUserData]);

  // Save data when it changes
  useEffect(() => {
    if (appReady && isAuthenticated && dataLoaded) {
      const timer = setTimeout(saveUserData, 500);
      return () => clearTimeout(timer);
    }
  }, [seen, unseen, isDarkMode, onboardingComplete, appReady, isAuthenticated, dataLoaded, saveUserData]);

  // Loading screen
  if (isLoading) {
    return <LoadingScreen onFinishLoading={() => setIsLoading(false)} isDarkMode={isDarkMode} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth flow
            <Stack.Screen name="Auth">
              {props => (
                <AuthScreen
                  {...props}
                  isDarkMode={isDarkMode}
                  onAuthenticate={handleAuthentication}
                />
              )}
            </Stack.Screen>
          ) : checkingOnboarding ? (
            // Checking onboarding
            <Stack.Screen name="CheckingOnboarding">
              {props => (
                <LoadingScreen
                  {...props}
                  onFinishLoading={() => {} }
                  isDarkMode={isDarkMode}
                />
              )}
            </Stack.Screen>
          ) : !onboardingComplete ? (
            // Onboarding flow
            <Stack.Screen name="Onboarding">
              {props => (
                <OnboardingScreen
                  {...props}
                  isDarkMode={isDarkMode}
                  onComplete={handleOnboardingComplete}
                  onAddToSeen={handleAddToSeen}
                />
              )}
            </Stack.Screen>
          ) : (
            // Main & Detail
            <>
              <Stack.Screen name="Main" options={{ headerShown: false }}>
                {props => (
                  <TabNavigator
                    {...props}
                    seen={seen}
                    unseen={unseen}
                    setSeen={setSeen}
                    setUnseen={setUnseen}
                    genres={genres}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    newReleases={
                      seen.length > 5
                        ? seen.slice(0, 10).map(m => ({ ...m }))
                        : unseen.slice(0, 10).map(m => ({ ...m }))
                    }
                    onAddToSeen={handleAddToSeen}
                    onAddToUnseen={handleAddToUnseen}
                    resetWildcardState={resetWildcardState}
                    resetAllUserData={resetAllUserData}
                    saveUserData={saveUserData}
                    loadUserData={loadUserData}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="MovieDetail"
                component={MovieDetailScreen}
                options={({ route }) => ({ title: route.params.movieTitle })}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
