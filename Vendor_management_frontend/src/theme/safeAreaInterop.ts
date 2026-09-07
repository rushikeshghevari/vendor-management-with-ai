import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Registers `className` support on react-native-safe-area-context's SafeAreaView.
 * NativeWind only auto-patches core RN components, not this one — any file using
 * `<SafeAreaView className="...">` should side-effect import this module first.
 */
cssInterop(SafeAreaView, { className: 'style' });
