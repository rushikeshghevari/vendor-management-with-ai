import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StagedDocument {
  uri: string;
  name: string;
  mimeType: string;
}

interface VendorDocumentPickerProps {
  label: string;
  optional?: boolean;
  value: StagedDocument | null;
  onChange: (file: StagedDocument | null) => void;
}

const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

/** One labeled upload slot — used four times (GST Certificate, PAN Card, Cancelled Cheque,
 *  MSME Certificate) on the Vendor Registration "Documents" step. Mirrors the pick-then-stage
 *  pattern of `QuotationPdfUploadCard`/`CreateRequirementQuotationScreen`'s attachment picker:
 *  nothing uploads until the wizard's final Confirm & Register submit. */
export function VendorDocumentPicker({ label, optional = false, value, onChange }: VendorDocumentPickerProps) {
  const pickFromDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: [...ATTACHMENT_TYPES] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onChange({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Allow camera access to photograph the document.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    onChange({ uri: asset.uri, name: asset.fileName ?? `camera-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  return (
    <View className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-ink dark:text-slate-200">
          {label}
          {optional ? ' (optional)' : ''}
        </Text>
        {value ? <Ionicons name="checkmark-circle" size={18} color="#43a047" /> : null}
      </View>

      {value ? (
        <View className="mt-2 flex-row items-center justify-between rounded-lg bg-success-50 px-3 py-2 dark:bg-success-900/20">
          <Text className="flex-1 text-xs text-ink dark:text-slate-200" numberOfLines={1}>
            {value.name}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={18} color="#dc2626" />
          </Pressable>
        </View>
      ) : (
        <View className="mt-2 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Select file for ${label}`}
            onPress={pickFromDocuments}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-3 dark:border-slate-600"
          >
            <Ionicons name="document-attach-outline" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600">File</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Photograph ${label}`}
            onPress={pickFromCamera}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-3 dark:border-slate-600"
          >
            <Ionicons name="camera-outline" size={16} color="#1e88e5" />
            <Text className="text-xs font-semibold text-primary-600">Camera</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
