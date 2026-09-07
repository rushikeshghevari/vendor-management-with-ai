import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AiComparisonScreen } from '@/features/requirements/screens/AiComparisonScreen';
import { CreateRequirementScreen } from '@/features/requirements/screens/CreateRequirementScreen';
import { CreateRequirementQuotationScreen } from '@/features/requirements/screens/CreateRequirementQuotationScreen';
import { DirectorReviewScreen } from '@/features/requirements/screens/DirectorReviewScreen';
import { EditRequirementScreen } from '@/features/requirements/screens/EditRequirementScreen';
import { PdfViewerScreen } from '@/features/requirements/screens/PdfViewerScreen';
import { QuotationOcrResultScreen } from '@/features/requirements/screens/QuotationOcrResultScreen';
import { RequirementDetailsScreen } from '@/features/requirements/screens/RequirementDetailsScreen';
import { RequirementListScreen } from '@/features/requirements/screens/RequirementListScreen';
import { RequirementPipelineScreen } from '@/features/requirements/screens/RequirementPipelineScreen';
import { SelectExistingVendorScreen } from '@/features/requirements/screens/SelectExistingVendorScreen';
import { VendorRegistrationScreen } from '@/features/requirements/screens/VendorRegistrationScreen';
import { VendorRegistrationLinkVerifyScreen } from '@/features/requirements/screens/VendorRegistrationLinkVerifyScreen';
import type { RequirementsStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RequirementsStackParamList>();

export function RequirementsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequirementList" component={RequirementListScreen} />
      <Stack.Screen name="RequirementDetails" component={RequirementDetailsScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="CreateRequirement" component={CreateRequirementScreen} />
      <Stack.Screen name="EditRequirement" component={EditRequirementScreen} />
      <Stack.Screen name="CreateRequirementQuotation" component={CreateRequirementQuotationScreen} />
      <Stack.Screen name="QuotationOcrResult" component={QuotationOcrResultScreen} />
      <Stack.Screen name="AiComparison" component={AiComparisonScreen} />
      <Stack.Screen name="DirectorReview" component={DirectorReviewScreen} />
      <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
      <Stack.Screen name="SelectExistingVendor" component={SelectExistingVendorScreen} />
      <Stack.Screen name="VendorRegistrationLinkVerify" component={VendorRegistrationLinkVerifyScreen} />
      <Stack.Screen name="RequirementPipeline" component={RequirementPipelineScreen} />
    </Stack.Navigator>
  );
}
