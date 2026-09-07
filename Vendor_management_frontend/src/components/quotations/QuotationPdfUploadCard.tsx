import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

export interface StagedPdfFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface QuotationPdfUploadCardProps {
  value: StagedPdfFile | null;
  onChange: (file: StagedPdfFile | null) => void;
  /** Shown when Submit was attempted without a PDF staged or already on file. */
  errorMessage?: string;
  /** Latest persisted version, if any — Edit mode only; informational, never removable here
   *  (the backend keeps every uploaded version and never deletes one). */
  existingFileName?: string;
  existingVersionCount?: number;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Stages a PDF locally — it isn't sent to the backend until the screen's Save/Submit
 * handler uploads it (same `uploadQuotationPdf` RTK Query mutation as before, just
 * triggered at save time instead of pick time). "Remove" therefore only ever clears
 * this local selection; it never deletes an already-uploaded version, since the backend
 * has no such endpoint and version history is intentionally never overwritten.
 */
export function QuotationPdfUploadCard({
  value,
  onChange,
  errorMessage,
  existingFileName,
  existingVersionCount,
}: QuotationPdfUploadCardProps) {
  const [pickError, setPickError] = useState<string | null>(null);

  const pick = async () => {
    setPickError(null);
    const result = await DocumentPicker.getDocumentAsync({ type: PDF_MIME_TYPE });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.mimeType && asset.mimeType !== PDF_MIME_TYPE) {
      setPickError('Only PDF files are allowed.');
      return;
    }
    if (asset.size && asset.size > MAX_SIZE_BYTES) {
      setPickError('File exceeds the 10 MB limit.');
      return;
    }

    onChange({ uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType ?? PDF_MIME_TYPE });
  };

  const handleRemove = () => {
    setPickError(null);
    onChange(null);
  };

  return (
    <DashboardCard className="mb-4">
      <Text className="text-sm font-semibold text-ink dark:text-slate-200">Quotation PDF</Text>

      {!value ? (
        <>
          {existingFileName ? (
            <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">
              Current on file: {existingFileName}
              {existingVersionCount ? ` (${existingVersionCount} version${existingVersionCount > 1 ? 's' : ''})` : ''}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select PDF"
            onPress={pick}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-6 dark:border-slate-600"
          >
            <Ionicons name="document-outline" size={20} color="#1e88e5" />
            <Text className="text-sm font-semibold text-primary-600">Select PDF</Text>
          </Pressable>
        </>
      ) : (
        <View className="mt-3 rounded-xl border border-success-200 bg-success-50 p-3 dark:border-success-900 dark:bg-success-900/20">
          <View className="flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color="#43a047" />
            <Text className="flex-1 text-sm font-semibold text-ink dark:text-white" numberOfLines={1}>
              {value.name}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-ink-muted dark:text-slate-400">{formatFileSize(value.size)}</Text>
          <Text className="mt-1 text-xs font-medium text-success-700 dark:text-success-400">
            {existingFileName === value.name ? 'Uploaded Successfully' : 'Selected — will upload when you save'}
          </Text>

          <View className="mt-3 flex-row gap-3">
            <Button label="Replace PDF" variant="secondary" onPress={pick} className="flex-1" />
            <Button label="Remove PDF" variant="dangerOutline" onPress={handleRemove} className="flex-1" />
          </View>
        </View>
      )}

      {pickError ? <Text className="mt-2 text-sm text-red-600 dark:text-red-400">{pickError}</Text> : null}
      {errorMessage ? <Text className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</Text> : null}
    </DashboardCard>
  );
}
