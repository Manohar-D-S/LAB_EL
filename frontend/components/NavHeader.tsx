import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, Menu, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type NavHeaderProps = {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showEmergencyCall?: boolean;
  onMenuPress?: () => void;
  onEmergencyCall?: () => void;
};

export default function NavHeader({
  title,
  showBack = false,
  showMenu = false,
  showEmergencyCall = false,
  onMenuPress,
  onEmergencyCall,
}: NavHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    router.back();
  };

  const handleEmergencyCall = () => {
    // In a real app, this would initiate a call to emergency services
    if (onEmergencyCall) {
      onEmergencyCall();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity onPress={handleBackPress} style={styles.iconButton}>
            <ArrowLeft color="#333" size={24} />
          </TouchableOpacity>
        )}
        
        {showMenu && (
          <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
            <Menu color="#333" size={24} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.rightContainer}>
        {showEmergencyCall && (
          <TouchableOpacity onPress={handleEmergencyCall} style={styles.emergencyButton}>
            <Phone color="white" size={20} />
            <Text style={styles.emergencyText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  leftContainer: {
    flexDirection: 'row',
    width: 80,
  },
  rightContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emergencyText: {
    color: 'white',
    marginLeft: 4,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  }
});