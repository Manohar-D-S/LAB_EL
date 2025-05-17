import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NavHeader from '@/components/NavHeader';
import { MapPin, Volume2, BellRing, Moon, Wifi, User, LogOut, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [offlineMapsEnabled, setOfflineMapsEnabled] = useState(true);

  const renderSettingSwitch = (
    title: string, 
    description: string, 
    icon: React.ReactNode, 
    value: boolean, 
    onValueChange: (value: boolean) => void
  ) => {
    return (
      <View style={styles.settingItem}>
        <View style={styles.settingIconContainer}>{icon}</View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#e0e0e0', true: '#E53935' }}
          thumbColor={value ? 'white' : '#f4f3f4'}
          ios_backgroundColor="#e0e0e0"
        />
      </View>
    );
  };

  const renderSettingLink = (
    title: string, 
    description: string, 
    icon: React.ReactNode, 
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <View style={styles.settingIconContainer}>{icon}</View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <ChevronRight color="#777" size={20} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavHeader title="Settings" />
      
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          {renderSettingSwitch(
            'Notifications',
            'Receive alerts about emergencies',
            <BellRing color="#333" size={22} />,
            notificationsEnabled,
            setNotificationsEnabled
          )}
          
          {renderSettingSwitch(
            'Sounds',
            'Play sounds for navigation alerts',
            <Volume2 color="#333" size={22} />,
            soundsEnabled,
            setSoundsEnabled
          )}
          
          {renderSettingSwitch(
            'Dark Mode',
            'Use dark theme for low-light conditions',
            <Moon color="#333" size={22} />,
            darkModeEnabled,
            setDarkModeEnabled
          )}
          
          {renderSettingSwitch(
            'Offline Maps',
            'Download maps for offline use',
            <Wifi color="#333" size={22} />,
            offlineMapsEnabled,
            setOfflineMapsEnabled
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Map Settings</Text>
          
          {renderSettingLink(
            'Default Location',
            'Set your hospital or station as default',
            <MapPin color="#333" size={22} />,
            () => {}
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {renderSettingLink(
            'Profile',
            'Update your driver information',
            <User color="#333" size={22} />,
            () => {}
          )}
          
          <TouchableOpacity style={styles.logoutButton} onPress={() => {}}>
            <LogOut color="#E53935" size={20} style={styles.logoutIcon} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Ambulance Navigation App v1.0.0</Text>
          <Text style={styles.copyright}>© 2025 All Rights Reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#777',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#E53935',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
  },
  appVersion: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  copyright: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#999',
  },
});