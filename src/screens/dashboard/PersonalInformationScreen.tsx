import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppInput } from 'src/components/AppInput';
import { AppButton } from 'src/components/AppButton';
import { RootState, AppDispatch } from 'src/store';
import { updateUserThunk } from 'src/store/authSlice';
import { getNecessityErrorMessage } from 'src/services/authNecessity';
import { colors } from 'src/theme/colors';
import { spacing } from 'src/theme/spacing';
import { fontSize, fontWeight } from 'src/theme/fonts';
import { NECESSITY_BASE_URL } from 'src/config/necessity';

const PLACEHOLDER = {
  fullName: 'Officer Name',
  email: 'officer@example.gov',
  phone: '+91 98765 43210',
  designation: 'Business Manager',
};

const schema = yup.object({
  fullName: yup.string().required('Full name is required').trim(),
  email: yup.string().required('Email is required').email('Enter a valid email'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  designation: yup.string().required('Designation is required').trim(),
});

type FormData = yup.InferType<typeof schema>;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const defaultFormValues = (user: RootState['auth']['user']): FormData => ({
  fullName: user?.full_name ?? '',
  email: user?.email ?? '',
  phone: user?.mobile_number ?? '',
  designation: user?.role ?? '',
});

export const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues(user),
  });

  const fullName = watch('fullName');

  // ✅ store FULL image object (not just uri)
  const [profileImage, setProfileImage] = useState<Asset | null>(null);

  // ✅ preview: local URI for picked image, NECESSITY URL for saved server photo
  const displayImageUri = profileImage?.uri
    ? profileImage.uri
    : user?.photo_url
      ? `${NECESSITY_BASE_URL}/necessity/files/${user.photo_url}`
      : null;

  const requestPhotoPermission = async (): Promise<boolean> => {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.PHOTO_LIBRARY
        : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

    const status = await request(permission);

    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) return true;

    if (status === RESULTS.BLOCKED) {
      Alert.alert('Photo access required', 'Please enable access in settings.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => openSettings() },
      ]);
      return false;
    }

    Toast.show({
      type: 'error',
      text1: 'Permission required',
      text2: 'Please allow photo access.',
    });

    return false;
  };

  // ✅ pick image and store full file metadata
  const handlePickImage = async () => {
    const hasPermission = await requestPhotoPermission();
    if (!hasPermission) return;

    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 800, maxHeight: 800 },
      (response) => {
        if (response.didCancel) return;

        if (response.errorCode) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: response.errorMessage ?? 'Failed to pick image.',
          });
          return;
        }

        const asset = response.assets?.[0];
        if (asset) {
          setProfileImage(asset); // ✅ important
        }
      }
    );
  };

  useEffect(() => {
    if (user) {
      reset(defaultFormValues(user));
    }
  }, [user, reset]);

  const onSave = async (data: FormData) => {
    setIsUpdating(true);
    try {
      await dispatch(
        updateUserThunk({
          full_name: data.fullName.trim(),
          mobile_number: data.phone.trim(),
          role: data.designation.trim(),
          ...(user?.district?.uuid && { district_uuid: user.district.uuid }),
          ...(profileImage?.uri && {
            profile_image: {
              uri: profileImage.uri,
              fileName: profileImage.fileName,
              type: profileImage.type,
            },
          }),
        })
      ).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Profile updated',
      });

      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: getNecessityErrorMessage(err),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal information</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.profileImageBtn} onPress={handlePickImage}>
          {displayImageUri ? (
            <Image source={{ uri: displayImageUri }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageInitials}>{getInitials(fullName)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Full name"
              value={value}
              onChangeText={onChange}
              placeholder={PLACEHOLDER.fullName}
              error={errors.fullName?.message}
              readOnly
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Email"
              value={value}
              onChangeText={onChange}
              placeholder={PLACEHOLDER.email}
              keyboardType="email-address"
              autoCapitalize="none"
              readOnly
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Phone"
              value={value}
              onChangeText={onChange}
              placeholder={PLACEHOLDER.phone}
              keyboardType="phone-pad"
              error={errors.phone?.message}
              readOnly
            />
          )}
        />
        <Controller
          control={control}
          name="designation"
          render={({ field: { value, onChange } }) => (
            <AppInput
              label="Designation"
              value={value}
              onChangeText={onChange}
              placeholder={PLACEHOLDER.designation}
              error={errors.designation?.message}
              readOnly
            />
          )}
        />

        {/* <AppButton title="Save changes" onPress={handleSubmit(onSave)} loading={isUpdating} /> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semiBold,
  },
  scrollContent: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    flexGrow: 1,
  },
  profileImageBtn: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profileImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageInitials: {
    color: '#fff',
    fontSize: fontSize.xxl,
  },
});
