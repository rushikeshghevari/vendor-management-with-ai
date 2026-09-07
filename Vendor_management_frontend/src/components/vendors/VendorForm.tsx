import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller } from 'react-hook-form';
import { Text, View } from 'react-native';
import { useMemo } from 'react';

import { ChipSelect } from '@/components/users/ChipSelect';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { TextField } from '@/components/ui/TextField';
import { FormSearchableDropdown } from '@/components/ui/FormSearchableDropdown';
import { GEOGRAPHY_DATA } from '@/constants/locations';
import {
  useGetDistrictsQuery,
  useGetStatesQuery,
  useGetTalukasQuery,
} from '@/features/address/api/addressApi';
import { vendorSchema, type VendorFormValues } from '@/features/vendors/vendorSchema';

const CATEGORY_OPTIONS = [
  { value: 'Pharmaceutical', label: 'Pharmaceutical' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Raw Material', label: 'Raw Material' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'Active' },
  { value: 'inactive' as const, label: 'Inactive' },
  { value: 'blacklisted' as const, label: 'Blacklisted' },
];

interface VendorFormProps {
  departmentName: string;
  vendorCode?: string;
  defaultValues?: Partial<VendorFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: VendorFormValues) => void;
  onCancel: () => void;
}

export function VendorForm({
  departmentName,
  vendorCode,
  defaultValues,
  submitLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: VendorFormProps) {
  // Parse taluka from address if editing
  const parsedDefaultValues = useMemo(() => {
    if (!defaultValues) return undefined;
    let initialTaluka = '';
    let initialAddress = defaultValues.address ?? '';
    if (initialAddress.includes(', Taluka: ')) {
      const parts = initialAddress.split(', Taluka: ');
      initialAddress = parts[0] || '';
      initialTaluka = parts[1] ?? '';
    }
    return {
      ...defaultValues,
      address: initialAddress,
      taluka: initialTaluka,
    };
  }, [defaultValues]);

  const { control, handleSubmit, setValue, watch } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      gstNumber: '',
      panNumber: '',
      address: '',
      state: '',
      district: '',
      city: '',
      taluka: '',
      pincode: '',
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      category: 'Pharmaceutical',
      status: 'active',
      ...parsedDefaultValues,
    },
  });

  const selectedState = watch('state');
  const selectedDistrict = watch('district');
  const selectedCity = watch('city');

  const { data: apiStates } = useGetStatesQuery();
  const { data: apiDistricts } = useGetDistrictsQuery(selectedState, { skip: !selectedState });
  const { data: apiTalukas } = useGetTalukasQuery(selectedDistrict, { skip: !selectedDistrict });

  const stateOptions = useMemo(() => {
    if (apiStates && apiStates.length > 0) {
      return apiStates.map((s) => ({ value: s.name || s.state_name, label: s.state_name || s.name }));
    }
    return GEOGRAPHY_DATA.map((s) => ({ value: s.name, label: s.name }));
  }, [apiStates]);

  const districtOptions = useMemo(() => {
    if (!selectedState) return [];
    if (apiDistricts && apiDistricts.length > 0) {
      return apiDistricts.map((d) => ({ value: d.name || d.district_name, label: d.district_name || d.name }));
    }
    const stateObj = GEOGRAPHY_DATA.find((s) => s.name === selectedState);
    return stateObj ? stateObj.districts.map((d) => ({ value: d.name, label: d.name })) : [];
  }, [selectedState, apiDistricts]);

  const cityOptions = useMemo(() => {
    if (!selectedState || !selectedDistrict) return [];
    const stateObj = GEOGRAPHY_DATA.find((s) => s.name === selectedState);
    const distObj = stateObj?.districts.find((d) => d.name === selectedDistrict);
    if (distObj && distObj.cities.length > 0) {
      return distObj.cities.map((c) => ({ value: c.name, label: c.name }));
    }
    return [{ value: selectedDistrict, label: selectedDistrict }];
  }, [selectedState, selectedDistrict]);

  const talukaOptions = useMemo(() => {
    if (!selectedDistrict) return [];
    if (apiTalukas && apiTalukas.length > 0) {
      return apiTalukas.map((t) => ({ value: t.name || t.taluka_name, label: t.taluka_name || t.name }));
    }
    if (!selectedState || !selectedCity) return [];
    const stateObj = GEOGRAPHY_DATA.find((s) => s.name === selectedState);
    const distObj = stateObj?.districts.find((d) => d.name === selectedDistrict);
    const cityObj = distObj?.cities.find((c) => c.name === selectedCity);
    return cityObj?.talukas ? cityObj.talukas.map((t) => ({ value: t, label: t })) : [];
  }, [selectedState, selectedDistrict, selectedCity, apiTalukas]);

  const handleStateChange = () => {
    setValue('district', '');
    setValue('city', '');
    setValue('taluka', '');
  };

  const handleDistrictChange = () => {
    setValue('city', '');
    setValue('taluka', '');
  };

  const handleCityChange = () => {
    setValue('taluka', '');
  };

  const handleFormSubmit = (values: VendorFormValues) => {
    const finalAddress = values.taluka ? `${values.address}, Taluka: ${values.taluka}` : values.address;
    onSubmit({
      ...values,
      address: finalAddress,
    });
  };

  return (
    <View>
      <Text className="mb-1.5 text-sm font-semibold text-ink dark:text-slate-200">Vendor Code</Text>
      <TextField
        label=""
        value={vendorCode ?? 'Auto-generated after saving'}
        editable={false}
        className="bg-slate-100 text-ink-muted dark:bg-slate-800"
      />

      <TextField label="Department" value={departmentName} editable={false} className="bg-slate-100 text-ink-muted dark:bg-slate-800" />

      <FormTextField control={control} name="name" label="Vendor Name" placeholder="e.g. Medisure Pharma" autoCapitalize="words" />
      <FormTextField control={control} name="contactPerson" label="Contact Person" placeholder="e.g. Ramesh Gupta" autoCapitalize="words" />
      <FormTextField control={control} name="phone" label="Mobile" placeholder="10-digit mobile number" keyboardType="phone-pad" />
      <FormTextField control={control} name="email" label="Email" placeholder="vendor@example.com" keyboardType="email-address" autoCapitalize="none" />
      <FormTextField control={control} name="gstNumber" label="GST Number (optional)" placeholder="e.g. 27AAACM1234A1Z5" autoCapitalize="characters" />
      <FormTextField control={control} name="panNumber" label="PAN Number (optional)" placeholder="e.g. AAACM1234A" autoCapitalize="characters" />

      <FormTextField control={control} name="address" label="Address" placeholder="Street / area" multiline numberOfLines={2} className="h-16" />
      
      <FormSearchableDropdown
        control={control}
        name="state"
        label="State"
        placeholder="Select State"
        options={stateOptions}
        onValueChange={handleStateChange}
      />
      
      <FormSearchableDropdown
        control={control}
        name="district"
        label="District"
        placeholder="Select District"
        options={districtOptions}
        disabled={!selectedState}
        onValueChange={handleDistrictChange}
      />

      <FormSearchableDropdown
        control={control}
        name="city"
        label="City"
        placeholder="Select City"
        options={cityOptions}
        disabled={!selectedDistrict}
        onValueChange={handleCityChange}
      />

      <FormSearchableDropdown
        control={control}
        name="taluka"
        label="Taluka (optional)"
        placeholder="Select Taluka"
        options={talukaOptions}
        disabled={!selectedCity}
      />

      <FormTextField control={control} name="pincode" label="Pincode" placeholder="6-digit pincode" keyboardType="number-pad" />

      <FormTextField control={control} name="bankName" label="Bank Name" placeholder="e.g. HDFC Bank" autoCapitalize="words" />
      <FormTextField control={control} name="accountHolderName" label="Account Holder Name" placeholder="As per bank records" autoCapitalize="words" />
      <FormTextField control={control} name="accountNumber" label="Account Number" placeholder="Bank account number" keyboardType="number-pad" />
      <FormTextField control={control} name="ifscCode" label="IFSC Code" placeholder="e.g. HDFC0001234" autoCapitalize="characters" />
      <FormTextField control={control} name="upiId" label="UPI ID (optional)" placeholder="e.g. vendor@bank" autoCapitalize="none" />

      <Controller
        control={control}
        name="category"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ChipSelect label="Vendor Category" value={value} options={CATEGORY_OPTIONS} onChange={onChange} errorMessage={error?.message} />
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <ChipSelect label="Status" value={value} options={STATUS_OPTIONS} onChange={onChange} errorMessage={error?.message} />
        )}
      />

      <Button label={submitLabel} loading={isSubmitting} onPress={handleSubmit(handleFormSubmit)} className="mt-2" />
      <Button label="Cancel" variant="secondary" onPress={onCancel} className="mt-3" />
    </View>
  );
}

