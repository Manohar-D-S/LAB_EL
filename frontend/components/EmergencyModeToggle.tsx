import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { TriangleAlert as AlertTriangle } from 'lucide-react-native';

type EmergencyModeToggleProps = {
  isEmergency: boolean;
  onToggle: (value: boolean) => void;
};

export default function EmergencyModeToggle({ isEmergency, onToggle }: EmergencyModeToggleProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, isEmergency && styles.emergencyActive]} 
      onPress={() => onToggle(!isEmergency)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <AlertTriangle 
          color={isEmergency ? 'white' : '#E53935'} 
          size={22} 
          style={styles.icon}
        />
        <Text style={[styles.text, isEmergency && styles.textEmergency]}>
          Emergency Mode {isEmergency ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Switch
        value={isEmergency}
        onValueChange={onToggle}
        trackColor={{ false: '#e0e0e0', true: '#ef5350' }}
        thumbColor={isEmergency ? 'white' : '#f4f3f4'}
        ios_backgroundColor="#e0e0e0"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E53935',
  },
  emergencyActive: {
    backgroundColor: '#E53935',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#E53935',
  },
  textEmergency: {
    color: 'white',
  }
});