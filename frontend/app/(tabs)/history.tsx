import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouteHistory, RouteHistoryItem } from '@/hooks/useRouteHistory';
import NavHeader from '@/components/NavHeader';
import { MapPin, Navigation, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const { history } = useRouteHistory();
  const router = useRouter();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHistoryItem = ({ item }: { item: RouteHistoryItem }) => {
    return (
      <TouchableOpacity style={styles.historyItem} onPress={() => {}}>
        {item.isEmergency && (
          <View style={styles.emergencyBadge}>
            <AlertTriangle color="white" size={12} />
          </View>
        )}
        
        <View style={styles.historyItemHeader}>
          <View style={styles.timeContainer}>
            <Clock color="#777" size={16} style={styles.timeIcon} />
            <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <MapPin color="#E53935" size={18} style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.source.address || `${item.source.latitude.toFixed(5)}, ${item.source.longitude.toFixed(5)}`}
            </Text>
          </View>
          
          <View style={styles.locationRowSeparator} />
          
          <View style={styles.locationRow}>
            <Navigation color="#E53935" size={18} style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.destination.address || `${item.destination.latitude.toFixed(5)}, ${item.destination.longitude.toFixed(5)}`}
            </Text>
          </View>
        </View>
        
        {item.route && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Distance: {item.route.distance} • Duration: {item.route.duration}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavHeader title="Route History" />
      
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock color="#ccc" size={64} />
          <Text style={styles.emptyText}>No route history yet</Text>
          <Text style={styles.emptySubtext}>
            Your previously navigated routes will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    marginRight: 4,
  },
  timestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#777',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  locationRowSeparator: {
    height: 12,
    width: 1,
    backgroundColor: '#ddd',
    marginLeft: 9,
    marginBottom: 8,
  },
  statsContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
  },
  statsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#555',
  },
  emergencyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#E53935',
    borderRadius: 4,
    padding: 4,
    zIndex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
  },
});