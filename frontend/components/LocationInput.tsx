import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { LocationType, bangaloreLocations } from '@/hooks/useLocation';
import { MapPin, Navigation, RotateCcw, Building2, Ambulance } from 'lucide-react-native';

type LocationInputProps = {
  label: string;
  placeholder: string;
  value: LocationType | null;
  onChange: (location: LocationType | null) => void;
  onSearch: (address: string) => Promise<void>;
  onReset?: () => void;
  error?: string | null;
  isLoading?: boolean;
  useCurrentLocation?: boolean;
  locationType?: 'source' | 'destination';
};

export default function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  onSearch,
  onReset,
  error,
  isLoading = false,
  useCurrentLocation = false,
  locationType = 'source',
}: LocationInputProps) {
  const [address, setAddress] = useState(value?.address || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationType[]>([]);

  useEffect(() => {
    // Filter locations based on input type
    if (address.length > 0) {
      let filteredLocations: LocationType[] = [];
      if (locationType === 'source') {
        // For source, show stations
        filteredLocations = bangaloreLocations.stations.filter(
          location => 
            location.name.toLowerCase().includes(address.toLowerCase()) ||
            location.address.toLowerCase().includes(address.toLowerCase())
        );
      } else {
        // For destination, show hospitals
        filteredLocations = bangaloreLocations.hospitals.filter(
          location => 
            location.name.toLowerCase().includes(address.toLowerCase()) ||
            location.address.toLowerCase().includes(address.toLowerCase())
        );
      }
      setSuggestions(filteredLocations);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [address, locationType]);

  const handleLocationSelect = (location: LocationType) => {
    setAddress(location.name || location.address || '');
    onChange(location);
    setShowSuggestions(false);
  };

  const renderSuggestion = ({ item }: { item: LocationType }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleLocationSelect(item)}
    >
      {item.type === 'hospital' ? (
        <Building2 color="#E53935" size={20} style={styles.suggestionIcon} />
      ) : (
        <Ambulance color="#E53935" size={20} style={styles.suggestionIcon} />
      )}
      <View style={styles.suggestionTextContainer}>
        <Text style={styles.suggestionTitle}>{item.name}</Text>
        <Text style={styles.suggestionAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[styles.inputContainer, !!error && styles.inputError]}>
        <MapPin color="#E53935" size={20} style={styles.icon} />
        
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={address}
          onChangeText={setAddress}
          onFocus={() => setShowSuggestions(true)}
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        {isLoading ? (
          <ActivityIndicator color="#E53935" style={styles.iconRight} />
        ) : (
          <TouchableOpacity onPress={() => onSearch(address)} style={styles.iconButton}>
            <Navigation color="#E53935" size={20} />
          </TouchableOpacity>
        )}
        
        {value && onReset && (
          <TouchableOpacity onPress={onReset} style={styles.iconButton}>
            <RotateCcw color="#777" size={20} />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.name || item.address || ''}
            style={styles.suggestionsList}
          />
        </View>
      )}
      
      {value && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            {value.name || value.address || `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#E53935',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
  iconButton: {
    padding: 8,
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  locationInfo: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
  },
  locationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#444',
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    padding: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  suggestionAddress: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#666',
  }
});