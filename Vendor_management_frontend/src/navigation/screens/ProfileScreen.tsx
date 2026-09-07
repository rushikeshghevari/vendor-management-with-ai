import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useLogoutMutation } from '@/features/auth/api/authApi';
import { useUpdateUserMutation } from '@/features/users/api/usersApi';
import { ROLES } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileStackParamList } from '@/navigation/types';
import { useTheme } from '@/providers/ThemeProvider';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  director: 'Director',
  ceo: 'CEO',
  department_user: 'Department User',
  accounts: 'Accounts',
  payment_department: 'Payment Department',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger = false,
  chevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const iconBg = danger ? (scheme === 'dark' ? '#451a1a' : '#fef2f2') : (scheme === 'dark' ? '#172554' : '#eff6ff');

  return (
    <Pressable onPress={onPress} style={[styles.menuItem, { borderTopColor: colors.border }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={danger ? '#ef4444' : '#1e88e5'} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger, { color: colors.text }]}>{label}</Text>
      {chevron ? <Ionicons name="chevron-forward" size={16} color="#94a3b8" /> : null}
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLES.SUPER_ADMIN);
  const isHod = hasRole(ROLES.HOD);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [updateUser, { isLoading: isUpdatingProfile }] = useUpdateUserMutation();
  const rootNavigation = useNavigation();
  const { colors, scheme } = useTheme();

  const photoKey = user ? `profile_photo_${user.id}` : null;
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState('');

  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);

  useEffect(() => {
    if (!photoKey) return;
    AsyncStorage.getItem(photoKey).then((uri) => {
      if (uri) setPhotoUri(uri);
    });
  }, [photoKey]);

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is required to take a photo. Please enable it in Settings.');
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is required. Please enable it in Settings.');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    setIsPhotoSheetOpen(false);
    const granted = await requestCameraPermission();
    if (!granted) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        if (photoKey) await AsyncStorage.setItem(photoKey, uri);
        setPhotoUri(uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open the camera.');
    }
  };

  const pickPhotoFromGallery = async () => {
    setIsPhotoSheetOpen(false);
    const granted = await requestGalleryPermission();
    if (!granted) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        if (photoKey) await AsyncStorage.setItem(photoKey, uri);
        setPhotoUri(uri);
      }
    } catch {
      Alert.alert('Error', 'Could not open the photo library.');
    }
  };

  const removePhoto = async () => {
    setIsPhotoSheetOpen(false);
    if (photoKey) await AsyncStorage.removeItem(photoKey);
    setPhotoUri(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    try {
      await updateUser({ id: user.id, body: { name: editName.trim(), phone: editPhone.trim() || undefined } }).unwrap();
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
    } catch {
      Alert.alert('Update Failed', 'Could not update your profile. Please try again.');
    }
  };

  const handleNotificationCenter = () => {
    let nav = rootNavigation as unknown as { getParent?: () => unknown; navigate: (name: string) => void };
    while (nav.getParent?.()) {
      nav = nav.getParent!() as typeof nav;
    }
    nav.navigate('NotificationCenter');
  };

  const handleContactSupport = () => {
    Alert.alert('Contact Support', 'How would you like to reach us?', [
      {
        text: 'Send Email',
        onPress: () =>
          Linking.openURL('mailto:support@ekamerp.com?subject=EKAM ERP Support').catch(() =>
            Alert.alert('Email', 'support@ekamerp.com'),
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAboutApp = () => {
    const version = Constants.expoConfig?.version ?? '1.0.0';
    Alert.alert(
      'EKAM ERP',
      `Vendor Management System\n\nVersion ${version}\n\nA comprehensive enterprise resource planning solution for managing vendors, quotations, bills, and payments.\n\n© 2024 EKAM. All rights reserved.`,
      [{ text: 'Close' }],
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const initials = (user?.name ?? 'U').charAt(0).toUpperCase();
  const roleLabel = (user && ROLE_LABELS[user.role]) ?? 'Team Member';

  const themedStyles = {
    profileCard: [styles.profileCard, { backgroundColor: colors.background, shadowColor: colors.border }],
    profileName: [styles.profileName, { color: colors.text }],
    profileEmail: [styles.profileEmail, { color: colors.textMuted }],
    card: [styles.card, { backgroundColor: colors.background, shadowColor: colors.border }],
    modalSheet: [styles.modalSheet, { backgroundColor: colors.background }],
    textInput: [styles.textInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }],
    modalTitle: [styles.modalTitle, { color: colors.text }],
    fieldLabel: [styles.fieldLabel, { color: colors.textMuted }],
    sheetItemText: [styles.sheetItemText, { color: colors.text }],
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Profile" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile header card */}
        <View style={themedStyles.profileCard}>
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Pressable
              onPress={() => setIsPhotoSheetOpen(true)}
              style={styles.editPhotoBadge}
              accessibilityLabel="Change profile photo"
            >
              <Ionicons name="camera" size={14} color="#ffffff" />
            </Pressable>
          </View>

          <Text style={themedStyles.profileName}>{user?.name ?? 'User'}</Text>
          <View style={styles.badgeRow}>
            <Badge label={roleLabel} variant="primary" />
          </View>
          <Text style={themedStyles.profileEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Info card */}
        <View style={themedStyles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow label="Full Name" value={user?.name ?? ''} />
          <InfoRow label="Email Address" value={user?.email ?? ''} />
          <InfoRow label="Role" value={roleLabel} />
          <InfoRow label="Status" value="Active" />
        </View>

        {/* Actions card */}
        <View style={themedStyles.card}>
          <Text style={styles.cardTitle}>Account Actions</Text>
          <MenuItem
            icon="create-outline"
            label="Edit Profile"
            onPress={() => {
              setEditName(user?.name ?? '');
              setEditPhone('');
              setIsEditing(true);
            }}
          />
          <MenuItem icon="camera-outline" label="Change Photo" onPress={() => setIsPhotoSheetOpen(true)} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
        </View>

        {/* App card */}
        <View style={themedStyles.card}>
          <Text style={styles.cardTitle}>Application</Text>
          <MenuItem icon="notifications-outline" label="Notification Center" onPress={handleNotificationCenter} />
          <MenuItem icon="settings-outline" label="App Settings" onPress={() => navigation.navigate('AppSettings')} />
          {isSuperAdmin ? (
            <MenuItem icon="options-outline" label="System Settings" onPress={() => navigation.navigate('SystemSettings')} />
          ) : null}
          {isSuperAdmin || isHod ? (
            <MenuItem icon="time-outline" label="Activity Log" onPress={() => navigation.navigate('ActivityLog')} />
          ) : null}
          {isSuperAdmin ? (
            <MenuItem icon="sparkles-outline" label="AI Audit Log" onPress={() => navigation.navigate('AiAuditLog')} />
          ) : null}
          <MenuItem icon="information-circle-outline" label="About App" onPress={handleAboutApp} />
          <MenuItem icon="headset-outline" label="Contact Support" onPress={handleContactSupport} />
        </View>

        {/* Logout */}
        <Button
          label={isLoggingOut ? 'Logging out…' : 'Logout'}
          variant="dangerOutline"
          loading={isLoggingOut}
          onPress={handleLogout}
          className="mt-4"
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditing} transparent animationType="slide" onRequestClose={() => setIsEditing(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditing(false)} />
        <View style={themedStyles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={themedStyles.modalTitle}>Edit Profile</Text>

          <Text style={themedStyles.fieldLabel}>Full Name</Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            style={themedStyles.textInput}
            placeholder="Enter your name"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
          />

          <Text style={themedStyles.fieldLabel}>Phone (optional)</Text>
          <TextInput
            value={editPhone}
            onChangeText={setEditPhone}
            style={themedStyles.textInput}
            placeholder="Enter phone number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
          />

          <Button label="Save Changes" loading={isUpdatingProfile} onPress={handleSaveProfile} className="mt-2" />
          <Button label="Cancel" variant="ghost" onPress={() => setIsEditing(false)} className="mt-3" />
        </View>
      </Modal>

      {/* Photo Options Sheet */}
      <Modal visible={isPhotoSheetOpen} transparent animationType="slide" onRequestClose={() => setIsPhotoSheetOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPhotoSheetOpen(false)} />
        <View style={[themedStyles.modalSheet, { paddingBottom: 8 }]}>
          <View style={styles.modalHandle} />
          <Text style={themedStyles.modalTitle}>Profile Photo</Text>

          <Pressable style={[styles.sheetItem, { borderTopColor: colors.border }]} onPress={takePhoto} accessibilityRole="button">
            <Ionicons name="camera-outline" size={22} color="#1e88e5" />
            <Text style={themedStyles.sheetItemText}>Take Photo</Text>
          </Pressable>

          <Pressable style={[styles.sheetItem, { borderTopColor: colors.border }]} onPress={pickPhotoFromGallery} accessibilityRole="button">
            <Ionicons name="image-outline" size={22} color="#1e88e5" />
            <Text style={themedStyles.sheetItemText}>Choose from Gallery</Text>
          </Pressable>

          {photoUri ? (
            <Pressable style={[styles.sheetItem, { borderTopColor: colors.border }]} onPress={removePhoto} accessibilityRole="button">
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={[themedStyles.sheetItemText, { color: '#ef4444' }]}>Remove Photo</Text>
            </Pressable>
          ) : null}

          <Pressable style={[styles.sheetItem, { borderTopColor: colors.border, marginTop: 6 }]} onPress={() => setIsPhotoSheetOpen(false)} accessibilityRole="button">
            <Text style={[themedStyles.sheetItemText, { color: '#64748b', textAlign: 'center', width: '100%' }]}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  profileCard: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 24, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1e88e5', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#ffffff', fontSize: 34, fontWeight: '700' },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  editPhotoBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e88e5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  badgeRow: { marginBottom: 6 },
  profileEmail: { fontSize: 13, color: '#64748b' },

  card: { backgroundColor: '#ffffff', borderRadius: 14, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#1e293b', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuIconWrapDanger: { backgroundColor: '#fef2f2' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1e293b' },
  menuLabelDanger: { color: '#ef4444' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 14 },

  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  sheetItemText: { marginLeft: 14, fontSize: 15, fontWeight: '500', color: '#1e293b' },
});
