import { Alert, ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { VendorForm } from '@/components/vendors/VendorForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { useGetVendorsQuery, useUpdateVendorMutation } from '@/features/vendors/api/vendorsApi';
import type { VendorFormValues } from '@/features/vendors/vendorSchema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { VendorsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<VendorsStackParamList, 'EditVendor'>;

export function EditVendorScreen({ navigation, route }: Props) {
  const { vendorId } = route.params;
  const { data: vendors, isLoading } = useGetVendorsQuery();
  const vendor = vendors?.find((item) => item.id === vendorId);
  const [updateVendor, { isLoading: isSaving }] = useUpdateVendorMutation();

  if (isLoading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Vendor" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Loader fullscreen />
      </Screen>
    );
  }

  if (!vendor) {
    return (
      <Screen padded={false}>
        <AppHeader title="Edit Vendor" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
        <Text className="p-6 text-center text-sm text-ink-muted dark:text-slate-400">Vendor not found.</Text>
      </Screen>
    );
  }

  const handleSubmit = async (values: VendorFormValues) => {
    try {
      await updateVendor({
        id: vendor.id,
        body: {
          name: values.name,
          contactPerson: values.contactPerson,
          phone: values.phone,
          email: values.email,
          gstNumber: values.gstNumber || undefined,
          panNumber: values.panNumber || undefined,
          address: values.address,
          state: values.state,
          district: values.district,
          city: values.city,
          pincode: values.pincode,
          bankDetails: {
            bankName: values.bankName,
            accountHolderName: values.accountHolderName,
            accountNumber: values.accountNumber,
            ifscCode: values.ifscCode,
            upiId: values.upiId || undefined,
          },
          category: values.category,
          status: values.status,
        },
      }).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could Not Update Vendor', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Edit Vendor" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <ScrollView
        className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <VendorForm
          departmentName={vendor.departmentName}
          vendorCode={vendor.code}
          submitLabel="Save Changes"
          isSubmitting={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => navigation.goBack()}
          defaultValues={{
            name: vendor.name,
            contactPerson: vendor.contactPerson,
            phone: vendor.phone,
            email: vendor.email,
            gstNumber: vendor.gstNumber ?? '',
            panNumber: vendor.panNumber ?? '',
            address: vendor.address,
            state: vendor.state,
            district: vendor.district,
            city: vendor.city,
            pincode: vendor.pincode,
            bankName: vendor.bankDetails.bankName,
            accountHolderName: vendor.bankDetails.accountHolderName,
            accountNumber: vendor.bankDetails.accountNumber,
            ifscCode: vendor.bankDetails.ifscCode,
            upiId: vendor.bankDetails.upiId ?? '',
            category: vendor.category,
            status: vendor.status,
          }}
        />
      </ScrollView>
    </Screen>
  );
}
