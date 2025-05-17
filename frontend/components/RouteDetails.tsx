import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { RouteType } from '@/hooks/useRoutes';
import { Clock, Route, ArrowUpRight } from 'lucide-react-native';

type RouteDetailsProps = {
  route: RouteType;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export default function RouteDetails({
  route,
  onClose,
  isExpanded = false,
  onToggleExpand,
}: RouteDetailsProps) {
  return (
    <View style={[styles.container, isExpanded && styles.expandedContainer]}>
      {/* Route Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Route color="#333" size={20} style={styles.summaryIcon} />
          <Text style={styles.summaryValue}>{route.distance}</Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.summaryItem}>
          <Clock color="#333" size={20} style={styles.summaryIcon} />
          <Text style={styles.summaryValue}>{route.duration}</Text>
          <Text style={styles.summaryLabel}>Duration</Text>
        </View>
        
        {onToggleExpand && (
          <TouchableOpacity onPress={onToggleExpand} style={styles.expandButton}>
            <ArrowUpRight color="#E53935" size={20} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Route Steps */}
      {isExpanded && (
        <ScrollView style={styles.stepsContainer}>
          {route.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepInstruction}>{step.instruction}</Text>
                <Text style={styles.stepStats}>
                  {step.distance} • {step.duration}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 16,
  },
  expandedContainer: {
    maxHeight: '60%',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#777',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#ddd',
    marginHorizontal: 16,
  },
  expandButton: {
    padding: 8,
  },
  stepsContainer: {
    marginTop: 16,
    maxHeight: 300,
  },
  stepItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  stepDetails: {
    flex: 1,
  },
  stepInstruction: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  stepStats: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#777',
  },
});