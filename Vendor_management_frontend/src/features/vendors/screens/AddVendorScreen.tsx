import { Alert, ScrollView, Text, KeyboardAvoidingView, Platform } from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { VendorForm } from '@/components/vendors/VendorForm';
import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/ui/Screen';
import { useGetDepartmentsQuery } from '@/features/departments/api/departmentsApi';
import { useCreateVendorMutation } from '@/features/vendors/api/vendorsApi';
import type { VendorFormValues } from '@/features/vendors/vendorSchema';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { DepartmentUserTabParamList, VendorsStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<VendorsStackParamList, 'AddVendor'>;

export function AddVendorScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { data: departments } = useGetDepartmentsQuery();
  const department = departments?.find((item) => item.id === user?.department);
  const [createVendor, { isLoading }] = useCreateVendorMutation();

  const returnTo = route.params?.returnTo;

  const handleSubmit = async (values: VendorFormValues) => {
    try {
      const vendor = await createVendor({
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
      }).unwrap();

      // Came from "No Active Vendor Found" in Create Quotation — go straight back there
      // with the new vendor pre-selected, instead of the normal "go back" behavior.
      if (returnTo === 'quotation') {
        navigation
          .getParent<BottomTabNavigationProp<DepartmentUserTabParamList>>()
          ?.navigate('Quotations', { screen: 'CreateQuotation', params: { autoSelectVendorId: vendor.id } });
        return;
      }

      Alert.alert('Vendor Registered', `${values.name} has been added.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could Not Register Vendor', getErrorMessage(error));
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Add Vendor" leftIcon="arrow-back" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 bg-surface-muted px-4 pt-4 dark:bg-surface-dark"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {!department ? (
            <Text className="mb-3 text-sm text-red-600 dark:text-red-400">
              Your account has no department assigned — contact your Super Admin before registering a vendor.
            </Text>
          ) : null}

          <VendorForm
            departmentName={department?.name ?? 'No department'}
            submitLabel="Register Vendor"
            isSubmitting={isLoading}
            onSubmit={handleSubmit}
            onCancel={() => navigation.goBack()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
