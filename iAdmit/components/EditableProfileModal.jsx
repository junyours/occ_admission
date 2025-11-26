import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  PermissionsAndroid,
  Share,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TextInput } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import client from '../API/client';
import { launchImageLibrary } from 'react-native-image-picker';
import * as FingerprintAPI from '../API/fingerprint';
import { getDeviceId } from '../utils/DeviceId';
// Optional: enable image capture for download
let captureRef;
let RNFS;
let ReactNativeBiometrics;
try {
  // Lazy require to avoid crashes if package isn't installed yet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  captureRef = require('react-native-view-shot').captureRef;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNFS = require('react-native-fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const biometricLib = require('react-native-biometrics');
  
  // Check if native module bridge is available
  const { NativeModules } = require('react-native');
  const nativeBridge = NativeModules.ReactNativeBiometrics;
  console.log('[Fingerprint] Native bridge check:', {
    hasNativeModules: !!NativeModules,
    hasReactNativeBiometrics: !!nativeBridge,
    bridgeMethods: nativeBridge ? Object.keys(nativeBridge) : 'no bridge'
  });
  
  // react-native-biometrics v3 exports a CLASS as default - must use constructor
  // The class constructor can take options: { allowDeviceCredentials: true/false }
  try {
    const ReactNativeBiometricsClass = biometricLib.default || biometricLib;
    console.log('[Fingerprint] Biometric class type:', typeof ReactNativeBiometricsClass);
    
    if (typeof ReactNativeBiometricsClass === 'function') {
      // Create an instance - this is required in v3
      ReactNativeBiometrics = new ReactNativeBiometricsClass({
        allowDeviceCredentials: true // Allow PIN/Pattern as fallback on Android
      });
      console.log('[Fingerprint] Created ReactNativeBiometrics instance successfully');
      console.log('[Fingerprint] Instance methods:', {
        hasIsSensorAvailable: typeof ReactNativeBiometrics.isSensorAvailable === 'function',
        hasCreateKeys: typeof ReactNativeBiometrics.createKeys === 'function',
        hasCreateSignature: typeof ReactNativeBiometrics.createSignature === 'function',
        hasBiometricKeysExist: typeof ReactNativeBiometrics.biometricKeysExist === 'function',
        hasDeleteKeys: typeof ReactNativeBiometrics.deleteKeys === 'function'
      });
    } else {
      console.log('[Fingerprint] ERROR: Default export is not a constructor/class');
      ReactNativeBiometrics = null;
    }
  } catch (e) {
    console.log('[Fingerprint] ERROR creating instance:', e);
    ReactNativeBiometrics = null;
  }
  
  if (!nativeBridge) {
    console.log('[Fingerprint] WARNING: Native module bridge is not available! The native module may not be linked properly.');
  }
} catch (e) {
  console.log('[Fingerprint] Biometric library not available:', e);
  console.log('[Fingerprint] Error details:', e.message, e.stack);
}

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 350;
const isShortScreen = height < 700;

export default function EditableProfileModal({ 
  visible, 
  examineeData, 
  onClose, 
  onUpdate 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [hasFingerprint, setHasFingerprint] = useState(false);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: height,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (examineeData) {
      console.log('[ProfileModal] Initializing with examineeData:', {
        hasGender: !!examineeData.gender,
        hasAge: !!examineeData.age,
        gender: examineeData.gender,
        age: examineeData.age,
        allKeys: Object.keys(examineeData)
      });
      
      const toUiPhone = (raw) => {
        if (raw == null) return '';
        const s = String(raw).replace(/\D/g, '');
        if (s.startsWith('63') && s.length === 12) {
          return '0' + s.substring(2);
        }
        if (s.length === 10 && !s.startsWith('0')) {
          return '0' + s;
        }
        return String(raw);
      };
      // Create full name from separate name fields
      const fullName = examineeData.fname + (examineeData.mname ? ' ' + examineeData.mname : '') + ' ' + examineeData.lname;
      
      const initialFormData = {
        name: fullName,
        lname: examineeData.lname || '',
        fname: examineeData.fname || '',
        mname: examineeData.mname || '',
        gender: examineeData.gender || '',
        age: examineeData.age ? String(examineeData.age) : '',
        school_name: examineeData.school_name || '',
        parent_name: examineeData.parent_name || '',
        parent_phone: toUiPhone(examineeData.parent_phone),
        phone: toUiPhone(examineeData.phone),
        address: examineeData.address || '',
      };
      
      console.log('[ProfileModal] Setting formData:', initialFormData);
      setFormData(initialFormData);
      
      // Set profile image if exists
      if (examineeData.Profile) {
        setProfileImage(`data:image/jpeg;base64,${examineeData.Profile}`);
      } else {
        setProfileImage(null);
      }
      setImageChanged(false);
    }
  }, [examineeData]);

  // Check biometric availability and fingerprint status when modal opens
  useEffect(() => {
    if (visible) {
      checkBiometricAvailability();
      checkFingerprintStatus();
    }
  }, [visible]);

  const checkBiometricAvailability = async () => {
    try {
      if (!ReactNativeBiometrics) {
        console.log('[Fingerprint] Biometric instance not available, trying to create...');
        // Try to load the library again
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const biometricLib = require('react-native-biometrics');
          const ReactNativeBiometricsClass = biometricLib.default || biometricLib;
          if (typeof ReactNativeBiometricsClass === 'function') {
            ReactNativeBiometrics = new ReactNativeBiometricsClass({
              allowDeviceCredentials: true
            });
            console.log('[Fingerprint] Created instance in checkBiometricAvailability');
          }
        } catch (loadError) {
          console.log('[Fingerprint] Failed to create instance:', loadError);
          setBiometricsAvailable(true); // Allow user to try anyway
          return;
        }
      }
      
      // Check if methods are available on the instance
      if (!ReactNativeBiometrics || typeof ReactNativeBiometrics.isSensorAvailable !== 'function') {
        console.log('[Fingerprint] Instance methods not available');
        // Still allow user to try - the registration function will show proper error
        setBiometricsAvailable(true);
        return;
      }
      
      // Check sensor availability using the instance
      console.log('[Fingerprint] Checking sensor availability...');
      
      const result = await ReactNativeBiometrics.isSensorAvailable();
      console.log('[Fingerprint] Sensor availability result:', JSON.stringify(result, null, 2));
      
      const { available, biometryType, error } = result;
      
      if (error) {
        console.log('[Fingerprint] Sensor check error:', error);
        // Even if there's an error, we might still be able to use biometrics
        // Set to true to allow user to try registering
        setBiometricsAvailable(true);
        return;
      }
      
      console.log('[Fingerprint] Biometric availability:', { 
        available, 
        biometryType,
        error: error || 'none'
      });
      
      // Set available if sensor exists, even if biometryType is undefined
      // This handles cases where under-display fingerprints might not be detected properly
      setBiometricsAvailable(available === true || biometryType !== undefined);
      
    } catch (error) {
      console.log('[Fingerprint] Error checking biometric availability:', error);
      console.log('[Fingerprint] Error details:', error.message, error.stack);
      // Set to true anyway to allow user to try - the registration will handle the actual check
      setBiometricsAvailable(true);
    }
  };

  const checkFingerprintStatus = async () => {
    try {
      const response = await FingerprintAPI.getFingerprintStatus();
      console.log('[Fingerprint] Status check response:', response);
      setHasFingerprint(response.has_fingerprint || false);
    } catch (error) {
      console.log('[Fingerprint] Error checking status:', error);
      setHasFingerprint(false);
    }
  };

  const handleRegisterFingerprint = async () => {
    try {
      setFingerprintLoading(true);
      
      // Try to load library if not already loaded
      if (!ReactNativeBiometrics || typeof ReactNativeBiometrics.isSensorAvailable !== 'function') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const biometricLib = require('react-native-biometrics');
          const { NativeModules } = require('react-native');
          const nativeBridge = NativeModules.ReactNativeBiometrics;
          
          console.log('[Fingerprint] Reloading - Native bridge:', {
            available: !!nativeBridge,
            methods: nativeBridge ? Object.keys(nativeBridge) : []
          });
          
          // Create instance using constructor (v3 requires this)
          const ReactNativeBiometricsClass = biometricLib.default || biometricLib;
          if (typeof ReactNativeBiometricsClass === 'function') {
            ReactNativeBiometrics = new ReactNativeBiometricsClass({
              allowDeviceCredentials: true
            });
            console.log('[Fingerprint] Created new instance');
          } else {
            throw new Error('ReactNativeBiometrics class not found');
          }
          
          console.log('[Fingerprint] After reload:', {
            instanceCreated: !!ReactNativeBiometrics,
            hasIsSensorAvailable: typeof ReactNativeBiometrics?.isSensorAvailable === 'function',
            hasCreateKeys: typeof ReactNativeBiometrics?.createKeys === 'function',
            nativeBridgeAvailable: !!nativeBridge
          });
        } catch (loadError) {
          console.log('[Fingerprint] Failed to load library:', loadError);
          Alert.alert(
            'Library Error',
            'Biometric authentication library could not be loaded. The native module may not be linked. Please:\n\n1. Stop Metro bundler\n2. Run: cd android && ./gradlew clean\n3. Rebuild the app\n\nIf the issue persists, the library may need to be manually linked.',
            [{ text: 'OK' }]
          );
          setFingerprintLoading(false);
          return;
        }
      }
      
      // Check if methods are available
      if (!ReactNativeBiometrics || typeof ReactNativeBiometrics.isSensorAvailable !== 'function') {
        console.log('[Fingerprint] Methods not available:', {
          ReactNativeBiometrics: !!ReactNativeBiometrics,
          isSensorAvailable: typeof ReactNativeBiometrics?.isSensorAvailable,
          createKeys: typeof ReactNativeBiometrics?.createKeys,
          allProps: ReactNativeBiometrics ? Object.keys(ReactNativeBiometrics) : []
        });
        Alert.alert(
          'Native Module Error',
          'Biometric authentication methods are not available. This usually means the native module is not properly linked.\n\nPlease rebuild the app:\n1. cd android\n2. ./gradlew clean\n3. cd ..\n4. npx react-native run-android',
          [{ text: 'OK' }]
        );
        setFingerprintLoading(false);
        return;
      }

      // react-native-biometrics exports methods directly, no constructor needed
      console.log('[Fingerprint] Attempting to register fingerprint...');
      
      // Try to check sensor availability first
      let biometryType = 'Fingerprint';
      try {
        console.log('[Fingerprint] Calling isSensorAvailable...');
        const sensorResult = await ReactNativeBiometrics.isSensorAvailable();
        console.log('[Fingerprint] Sensor check result:', sensorResult);
        
        if (sensorResult.biometryType) {
          biometryType = sensorResult.biometryType;
        }
        
        // If sensor explicitly says not available, show error but allow retry
        if (sensorResult.available === false && !sensorResult.error) {
          Alert.alert(
            'Biometric Setup Required',
            'Please make sure you have:\n\n1. Set up a fingerprint/face unlock in your device settings\n2. Enabled biometric authentication for apps\n3. Granted biometric permissions to this app\n\nThen try again.',
            [{ text: 'OK' }]
          );
          setFingerprintLoading(false);
          return;
        }
      } catch (sensorError) {
        console.log('[Fingerprint] Sensor check failed, continuing anyway:', sensorError);
        // Continue - sometimes the check fails but registration still works
      }

      // Try to create or get existing keys
      let publicKey;
      try {
        // Check if keys already exist (if method exists)
        if (typeof ReactNativeBiometrics.biometricKeysExist === 'function') {
          const keysExist = await ReactNativeBiometrics.biometricKeysExist();
          console.log('[Fingerprint] Keys exist:', keysExist);
          
          if (keysExist.keysExist) {
            // Keys exist, delete them first to create fresh ones
            console.log('[Fingerprint] Deleting existing keys...');
            if (typeof ReactNativeBiometrics.deleteKeys === 'function') {
              await ReactNativeBiometrics.deleteKeys();
            }
          }
        }
        
        // Create new keys
        console.log('[Fingerprint] Creating keys...');
        if (typeof ReactNativeBiometrics.createKeys !== 'function') {
          throw new Error('createKeys method is not available');
        }
        const keyResult = await ReactNativeBiometrics.createKeys();
        console.log('[Fingerprint] Key creation result:', keyResult);
        publicKey = keyResult.publicKey;
        
        if (!publicKey) {
          throw new Error('Failed to create biometric keys');
        }
      } catch (keyError) {
        console.log('[Fingerprint] Key creation error:', keyError);
        Alert.alert(
          'Key Creation Failed',
          'Unable to create biometric keys. Please make sure your device supports biometric authentication and try again.',
          [{ text: 'OK' }]
        );
        setFingerprintLoading(false);
        return;
      }

      // Create signature prompt (this will show the biometric prompt)
      const promptMessage = `Register ${biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Fingerprint'}`;
      console.log('[Fingerprint] Showing biometric prompt:', promptMessage);
      
      if (typeof ReactNativeBiometrics.createSignature !== 'function') {
        throw new Error('createSignature method is not available');
      }
      
      const signatureResult = await ReactNativeBiometrics.createSignature({
        promptMessage: promptMessage,
        payload: 'fingerprint_registration_' + Date.now(),
        cancelButtonText: 'Cancel',
      });
      
      console.log('[Fingerprint] Signature result:', signatureResult);

      if (signatureResult.success && signatureResult.signature && publicKey) {
        console.log('[Fingerprint] Biometric registration successful');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('fingerprint_public_key', publicKey);
        console.log('[Fingerprint] Public key stored locally for login');

        const fingerprintData = JSON.stringify({
          publicKey: publicKey,
          signature: signatureResult.signature,
          biometryType: biometryType,
          registeredAt: new Date().toISOString(),
        });

        const response = await FingerprintAPI.registerFingerprint(fingerprintData);
        console.log('[Fingerprint] API registration response:', response);

        if (response.success) {
          setHasFingerprint(true);
          setBiometricsAvailable(true);
          Alert.alert('Success', 'Fingerprint registered successfully! You can now use it to login.');
        } else {
          throw new Error(response.message || 'Registration failed');
        }
      } else if (signatureResult.error) {
        console.log('[Fingerprint] Signature error:', signatureResult.error);
        if (signatureResult.error === 'User cancellation') {
          Alert.alert('Cancelled', 'Fingerprint registration was cancelled.');
        } else {
          Alert.alert(
            'Registration Failed',
            signatureResult.error || 'Unable to register fingerprint. Please try again.'
          );
        }
      } else {
        Alert.alert('Cancelled', 'Fingerprint registration was cancelled.');
      }
    } catch (error) {
      console.log('[Fingerprint] Registration error:', error);
      console.log('[Fingerprint] Error details:', error.message, error.stack);
      
      let errorMessage = 'Failed to register fingerprint. Please try again.';
      
      if (error.message) {
        if (error.message.includes('not enrolled')) {
          errorMessage = 'Please set up a fingerprint or face unlock in your device settings first.';
        } else if (error.message.includes('not available')) {
          errorMessage = 'Biometric authentication is not available. Please check your device settings.';
        } else if (error.message.includes('hardware')) {
          errorMessage = 'Your device does not support biometric authentication.';
        } else if (error.message.includes('constructor')) {
          errorMessage = 'Biometric library error. Please restart the app and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Error',
        error?.response?.data?.message || errorMessage
      );
    } finally {
      setFingerprintLoading(false);
    }
  };

  const handleDeleteFingerprint = async () => {
    Alert.alert(
      'Remove Fingerprint',
      'Are you sure you want to remove your registered fingerprint?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setFingerprintLoading(true);
              const response = await FingerprintAPI.deleteFingerprint();
              console.log('[Fingerprint] Deletion response:', response);

              if (response.success) {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.removeItem('fingerprint_public_key');
                setHasFingerprint(false);
                Alert.alert('Success', 'Fingerprint removed successfully!');
              } else {
                throw new Error(response.message || 'Deletion failed');
              }
            } catch (error) {
              console.log('[Fingerprint] Deletion error:', error);
              Alert.alert(
                'Error',
                error?.response?.data?.message || error?.message || 'Failed to remove fingerprint. Please try again.'
              );
            } finally {
              setFingerprintLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const imageUri = `data:${asset.type};base64,${asset.base64}`;
        setProfileImage(imageUri);
        setImageChanged(true);
      }
    });
  };

  const validateForm = () => {
    const required = ['fname', 'lname', 'gender', 'age', 'school_name', 'parent_name', 'parent_phone', 'phone', 'address'];
    for (const field of required) {
      if (!formData[field] || String(formData[field]).trim() === '') {
        Alert.alert('Validation Error', `Please fill in the ${field.replace('_', ' ')} field.`);
        return false;
      }
    }
    // Validate age is a valid number
    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age > 120) {
      Alert.alert('Validation Error', 'Age must be a number between 1 and 120.');
      return false;
    }
    // Validate gender
    if (formData.gender !== 'Male' && formData.gender !== 'Female') {
      Alert.alert('Validation Error', 'Please select a valid gender.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('[Profile] Updating examinee data:', formData);
      
      // Prepare data with profile image if changed
      const updateData = { 
        lname: formData.lname,
        fname: formData.fname,
        mname: formData.mname,
        gender: formData.gender,
        age: parseInt(formData.age),
        school_name: formData.school_name,
        parent_name: formData.parent_name,
        parent_phone: String(formData.parent_phone).replace(/\D/g, ''),
        phone: String(formData.phone).replace(/\D/g, ''),
        address: formData.address,
      };
      
      if (imageChanged && profileImage) {
        // Extract base64 data from data URL
        const base64Data = profileImage.split(',')[1];
        updateData.Profile = base64Data;
      }
      
      const response = await client.put('/mobile/examinee/profile', updateData);
      console.log('[Profile] Update response:', response.data);
      
      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
        setImageChanged(false);
        onUpdate(response.data.examinee);
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.log('[Profile] Update error:', error?.response?.data || error?.message);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              setIsEditing(false);
              if (examineeData) {
                // Create full name from separate name fields
                const fullName = examineeData.fname + (examineeData.mname ? ' ' + examineeData.mname : '') + ' ' + examineeData.lname;
                
                setFormData({
                  name: fullName,
                  lname: examineeData.lname || '',
                  fname: examineeData.fname || '',
                  mname: examineeData.mname || '',
                  gender: examineeData.gender || '',
                  age: examineeData.age ? String(examineeData.age) : '',
                  school_name: examineeData.school_name,
                  parent_name: examineeData.parent_name,
                  parent_phone: examineeData.parent_phone,
                  phone: examineeData.phone,
                  address: examineeData.address,
                });
              }
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const renderGenderField = () => {
    console.log('[ProfileModal] Rendering gender field:', {
      isEditing,
      gender: formData.gender,
      hasGender: !!formData.gender
    });
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <Icon name="wc" size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.fieldLabel}>Gender</Text>
        </View>
        {isEditing ? (
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                formData.gender === 'Male' && styles.genderButtonSelected,
                !formData.gender && styles.genderButtonError
              ]}
              onPress={() => handleInputChange('gender', 'Male')}
            >
              <Text style={[
                styles.genderButtonText,
                formData.gender === 'Male' && styles.genderButtonTextSelected
              ]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                { marginRight: 0 },
                formData.gender === 'Female' && styles.genderButtonSelected,
                !formData.gender && styles.genderButtonError
              ]}
              onPress={() => handleInputChange('gender', 'Female')}
            >
              <Text style={[
                styles.genderButtonText,
                formData.gender === 'Female' && styles.genderButtonTextSelected
              ]}>
                Female
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{formData.gender || 'N/A'}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderField = (field, label, icon, keyboardType = 'default') => {
    // Set maxLength for phone fields and age
    const getMaxLength = () => {
      if (field === 'phone' || field === 'parent_phone') {
        return 11; // Limit phone numbers to 11 digits
      }
      if (field === 'age') {
        return 3; // Limit age to 3 digits (max 120)
      }
      return undefined; // No limit for other fields
    };

    // Name is not editable. In edit mode, show disabled field (greyed). Otherwise, show value.
    if (field === 'name') {
      // Create full name from separate fields
      const fullName = formData.fname + (formData.mname ? ' ' + formData.mname : '') + ' ' + formData.lname;
      
      return (
        <View style={styles.fieldContainer}>
          <View style={styles.fieldHeader}>
            <Icon name={icon} size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.fieldLabel}>{label}</Text>
          </View>
          {isEditing ? (
            <View style={[styles.inputContainer, styles.inputDisabledContainer]}>
              <TextInput
                label=""
                value={fullName}
                editable={false}
                style={[styles.textInput, styles.textInputDisabled]}
                contentStyle={[styles.inputContent, styles.inputContentDisabled]}
                underlineStyle={{ display: 'none' }}
                theme={{
                  colors: {
                    primary: '#6b7280',
                    placeholder: '#6b7280',
                    text: '#9ca3af',
                    background: 'transparent',
                  }
                }}
              />
            </View>
          ) : (
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{fullName || 'N/A'}</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <Icon name={icon} size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {isEditing ? (
          <View style={[styles.inputContainer, focusedField === field && styles.inputContainerFocused]}>
            <TextInput
              label=""
              value={String(formData[field] || '')}
              onChangeText={(value) => {
                // For phone fields, only allow digits and limit length
                if (field === 'phone' || field === 'parent_phone') {
                  const digitsOnly = value.replace(/\D/g, '');
                  if (digitsOnly.length <= 11) {
                    handleInputChange(field, digitsOnly);
                  }
                } else if (field === 'age') {
                  // For age, only allow digits and limit to 3 digits
                  const digitsOnly = value.replace(/\D/g, '');
                  if (digitsOnly.length <= 3) {
                    handleInputChange(field, digitsOnly);
                  }
                } else {
                  handleInputChange(field, value);
                }
              }}
              onFocus={() => setFocusedField(field)}
              onBlur={() => setFocusedField(null)}
              keyboardType={keyboardType}
              maxLength={getMaxLength()}
              style={styles.textInput}
              contentStyle={styles.inputContent}
              underlineStyle={{ display: 'none' }}
              theme={{
                colors: {
                  primary: '#667eea',
                  placeholder: 'rgba(255, 255, 255, 0.4)',
                  text: '#ffffff',
                  background: 'transparent',
                }
              }}
            />
          </View>
        ) : (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{String(formData[field] || 'N/A')}</Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.modal}>
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={styles.modalGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={20} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.title}>{isEditing ? 'Edit Profile' : 'Student Profile'}</Text>
              <View style={styles.headerActions}>
                {isEditing ? (
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={styles.actionButton}
                  >
                    <Icon name="close" size={20} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.actionButton}
                  >
                    <Icon name="edit" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {examineeData && (
              <View style={styles.profileSection}>
                {/* Identity Card */}
                <View style={styles.profileCard}>
                  <LinearGradient
                    colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionHeaderBadge}>
                        <Icon name="badge" size={14} color="#a855f7" />
                        <Text style={styles.sectionHeaderText}>Identity</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.sectionHint}></Text>
                        <TouchableOpacity
                          onPress={() => setShowIdCard(true)}
                          style={styles.viewIdButton}
                          accessibilityLabel="View ID Card"
                        >
                          <Icon name="credit-card" size={14} color="#ffffff" />
                          <Text style={styles.viewIdButtonText}>View ID</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.profileInfo}>
                      <TouchableOpacity 
                        style={styles.profileAvatar}
                        onPress={isEditing ? handleImagePicker : null}
                        disabled={!isEditing}
                      >
                        {profileImage ? (
                          <View style={styles.avatarImageContainer}>
                            <Image
                              source={{ uri: profileImage }}
                              style={styles.avatarImage}
                              resizeMode="cover"
                            />
                            {isEditing && (
                              <View style={styles.avatarOverlay}>
                                <Icon name="camera-alt" size={20} color="#ffffff" />
                              </View>
                            )}
                          </View>
                        ) : (
                          <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.avatarGradient}
                          >
                            <Icon name={isEditing ? "add-a-photo" : "person"} size={30} color="#ffffff" />
                          </LinearGradient>
                        )}
                      </TouchableOpacity>
                      <View style={styles.profileDetails}>
                        <Text style={styles.profileName}>
                          {formData.fname + (formData.mname ? ' ' + formData.mname : '') + ' ' + formData.lname || 'N/A'}
                        </Text>
                        <Text style={styles.profileRole}>Student</Text>
                        {isEditing && (
                          <TouchableOpacity onPress={handleImagePicker} style={styles.changePhotoButton}>
                            <Text style={styles.changePhotoText}>
                              {profileImage ? 'Change Photo' : 'Add Photo'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.fieldsContainer}>
                      {renderField('name', 'Full Name', 'person', 'default')}
                      {renderGenderField()}
                      {renderField('age', 'Age', 'calendar-today', 'numeric')}
                      {renderField('school_name', 'Previous Attended School', 'school', 'default')}
                    </View>
                  </LinearGradient>
                </View>

                {/* Contact Card */}
                <View style={styles.profileCard}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.08)', 'rgba(59, 130, 246, 0.06)']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionHeaderBadge, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                        <Icon name="contact-phone" size={14} color="#10b981" />
                        <Text style={[styles.sectionHeaderText, { color: '#10b981' }]}>Contact</Text>
                      </View>
                      <Text style={styles.sectionHint}>Use active numbers so we can reach you.</Text>
                    </View>

                    <View style={styles.fieldsContainer}>
                      {renderField('phone', 'Phone Number', 'phone', 'phone-pad')}
                      {renderField('address', 'Address', 'home', 'default')}
                    </View>
                  </LinearGradient>
                </View>

                {/* Guardian Card */}
                <View style={styles.profileCard}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.08)', 'rgba(168, 85, 247, 0.06)']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionHeaderBadge, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }]}>
                        <Icon name="family-restroom" size={14} color="#f59e0b" />
                        <Text style={[styles.sectionHeaderText, { color: '#f59e0b' }]}>Parent/Guardian</Text>
                      </View>
                      <Text style={styles.sectionHint}>We'll use this for emergencies only.</Text>
                    </View>

                    <View style={styles.fieldsContainer}>
                      {renderField('parent_name', 'Parent Name', 'people', 'default')}
                      {renderField('parent_phone', 'Parent Phone', 'phone-iphone', 'phone-pad')}
                    </View>

                    {isEditing && (
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          onPress={handleCancel}
                          style={styles.cancelButton}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSave}
                          style={[styles.saveButtonLarge, loading && styles.saveButtonDisabled]}
                          disabled={loading}
                        >
                          <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.saveButtonGradient}
                          >
                            <Text style={styles.saveButtonText}>
                              {loading ? 'Saving...' : 'Save Changes'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </LinearGradient>
                </View>

                {/* Biometric Security Card */}
                <View style={styles.profileCard}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.08)', 'rgba(59, 130, 246, 0.06)']}
                    style={styles.cardGradient}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionHeaderBadge, { backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.2)' }]}>
                        <Icon name="fingerprint" size={14} color="#8b5cf6" />
                        <Text style={[styles.sectionHeaderText, { color: '#8b5cf6' }]}>Biometric Security</Text>
                      </View>
                    </View>

                    <View style={styles.fingerprintContainer}>
                      {hasFingerprint ? (
                        <View style={styles.fingerprintRegisteredSimple}>
                          <View style={styles.fingerprintActiveCard}>
                            <View style={styles.fingerprintIconCircle}>
                              <LinearGradient
                                colors={['#10b981', '#059669']}
                                style={styles.fingerprintIconGradient}
                              >
                                <Icon name="fingerprint" size={32} color="#ffffff" />
                              </LinearGradient>
                            </View>
                            <View style={styles.fingerprintStatusBadge}>
                              <Icon name="check-circle" size={16} color="#10b981" />
                              <Text style={styles.fingerprintStatusBadgeText}>Active</Text>
                            </View>
                            <Text style={styles.fingerprintStatusTitle}>Biometric Security Enabled</Text>
                            <Text style={styles.fingerprintStatusSubtitle}>
                              Your fingerprint is registered and ready to use
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleDeleteFingerprint}
                            style={styles.removeFingerprintButtonSimple}
                            disabled={fingerprintLoading}
                          >
                            <Icon name="delete-outline" size={18} color="#ef4444" />
                            <Text style={[styles.removeFingerprintTextSimple, { marginLeft: 6 }]}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.fingerprintNotRegisteredSimple}>
                          <View style={styles.fingerprintIconCircleInactive}>
                            <Icon name="fingerprint" size={36} color="rgba(139, 92, 246, 0.6)" />
                          </View>
                          <Text style={styles.fingerprintPromptTitle}>Enable Biometric Login</Text>
                          <Text style={styles.fingerprintPromptSubtitle}>
                            Secure your account with fingerprint.
                          </Text>
                          <TouchableOpacity
                            onPress={handleRegisterFingerprint}
                            style={[styles.registerFingerprintButtonSimple, fingerprintLoading && styles.registerFingerprintButtonDisabled]}
                            disabled={fingerprintLoading}
                          >
                            <LinearGradient
                              colors={['#8b5cf6', '#6366f1']}
                              style={styles.registerFingerprintGradientSimple}
                            >
                              {fingerprintLoading ? (
                                <Icon name="refresh" size={20} color="#ffffff" />
                              ) : (
                                <Icon name="fingerprint" size={20} color="#ffffff" />
                              )}
                              <Text style={[styles.registerFingerprintTextSimple, { marginLeft: 8 }]}>
                                {fingerprintLoading ? 'Setting up...' : 'Enable Now'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </View>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      {/* ID Card Modal */}
      <IdCardModal
        visible={showIdCard}
        onClose={() => setShowIdCard(false)}
        data={formData}
        photoUri={profileImage}
      />
    </View>
  );
}

function IdCardModal({ visible, onClose, data, photoUri }) {
  if (!visible) return null;
  const name = (data?.fname || '') + (data?.mname ? ' ' + data.mname : '') + ' ' + (data?.lname || '');
  const school = data?.school_name || '';
  const phone = data?.phone || '';
  const parentName = data?.parent_name || '';
  const parentPhone = data?.parent_phone || '';
  const address = data?.address || '';
  const gender = data?.gender || '';
  const age = data?.age || '';
  const occName = 'Opol Community College';
  const cardRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const toggleFlip = () => {
    Animated.timing(flipAnim, { toValue: isFlipped ? 0 : 1, duration: 400, useNativeDriver: true }).start(() => {
      setIsFlipped(prev => !prev);
    });
  };
  const requestWritePermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const read = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        // WRITE permission is not used on 33+, using app-scoped or MediaStore via RNFS
        return read === PermissionsAndroid.RESULTS.GRANTED;
      }
      const write = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return write === PermissionsAndroid.RESULTS.GRANTED;
    } catch { return false; }
  };
  const handleDownload = async () => {
    try {
      if (!captureRef || !RNFS) {
        Alert.alert('Download Unavailable', 'Please install react-native-view-shot and react-native-fs to enable download.');
        return;
      }
      const ok = await requestWritePermission();
      if (!ok) {
        Alert.alert('Permission Required', 'Storage permission is needed to save the ID image.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
      const fileName = `OCC-ID-${Date.now()}.png`;
      const candidates = [];
      if (Platform.OS === 'android') {
        if (RNFS.DownloadDirectoryPath) candidates.push(`${RNFS.DownloadDirectoryPath}/${fileName}`);
        if (RNFS.PicturesDirectoryPath) candidates.push(`${RNFS.PicturesDirectoryPath}/${fileName}`);
        candidates.push(`${RNFS.ExternalCachesDirectoryPath || RNFS.CachesDirectoryPath}/${fileName}`);
      } else {
        candidates.push(`${RNFS.PicturesDirectoryPath || RNFS.DocumentDirectoryPath}/${fileName}`);
      }
      let savedPath = '';
      let lastErr = null;
      for (const dest of candidates) {
        try { await RNFS.copyFile(uri, dest); savedPath = dest; break; } catch (e) { lastErr = e; }
      }
      if (!savedPath) {
        // Fallback: stay in temp and share
        try {
          await Share.share({ url: uri, message: 'OCC ID card' });
          return;
        } catch {}
        throw lastErr || new Error('Saving failed');
      }
      Alert.alert('Saved', Platform.OS === 'android' ? 'ID saved to device storage.' : 'ID saved to Photos/Documents.');
    } catch (e) {
      console.log('[IDCard] Download failed', e);
      Alert.alert('Error', 'Failed to save ID image.');
    }
  };
  return (
    <View style={styles.idModalOverlay}>
      <View style={styles.idModalContainer}>
        <View style={styles.idCardRotateBox} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={toggleFlip}>
            <Animated.View ref={cardRef} style={styles.idCardContainer}>
              <Animated.View style={[styles.cardFace, styles.idCardFront, { transform: [{ rotateY: frontRotate }] }]}>
                <LinearGradient colors={["#0b1a34", "#1e3a8a"]} style={styles.idHeader}> 
                  <View style={styles.idHeaderRow}>
                    <View style={styles.idSchoolBadge}>
                      <Image source={require('../logo.png')} style={styles.idSchoolLogo} resizeMode="contain" />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.idSchoolName}>{occName}</Text>
                        <Text style={styles.idSchoolSub}>Student Identification</Text>
                      </View>
                    </View>
                    <View style={styles.idHeaderRight}>
                      <Text style={styles.idTapHint}>Tap to flip</Text>
                      <Icon name="flip" size={16} color="#ffffff" />
                    </View>
                  </View>
                </LinearGradient>
                <LinearGradient
                  colors={["#f8fafc", "#eef2ff", "#dbeafe"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.idBody}
                >
                  <View style={styles.idPattern} pointerEvents="none">
                    <View style={styles.pCircle1} />
                    <View style={styles.pCircle2} />
                    <View style={styles.pCircle3} />
                    <View style={styles.pStripe1} />
                    <View style={styles.pStripe2} />
                    <View style={styles.pStripe3} />
                  </View>
                  <Image source={require('../occbld.png')} style={[styles.idWatermark, isSmallScreen && styles.idWatermarkSmall]} resizeMode="cover" pointerEvents="none" />
                  <LinearGradient
                    colors={['rgba(248,250,252,0)', 'rgba(248,250,252,0.12)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.idBodyScrim}
                    pointerEvents="none"
                  />
                  <View style={styles.idMainRow}>
                    <View style={styles.idLeftCol}>
                      <View style={styles.idPhotoBox}>
                        {photoUri ? (
                          <Image source={{ uri: photoUri }} style={styles.idPhotoLarge} resizeMode="cover" />
                        ) : (
                          <View style={[styles.idPhotoLarge, { backgroundColor: 'rgba(255,255,255,0.35)', justifyContent: 'center', alignItems: 'center' }]}>
                            <Icon name="person" size={48} color="#6b7280" />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.idRightCol}>
                      <Text style={styles.idName} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
                      <Text style={styles.idRole}>Student</Text>
                      <View style={styles.idDivider} />
                      <View style={styles.idFieldRow}>
                        <Icon name="wc" size={14} color="#1f2937" />
                        <Text style={styles.idFieldKey}>Gender</Text>
                      </View>
                      <Text style={styles.idFieldVal} numberOfLines={1}>{gender || 'N/A'}</Text>
                      <View style={styles.idFieldRow}>
                        <Icon name="calendar-today" size={14} color="#1f2937" />
                        <Text style={styles.idFieldKey}>Age</Text>
                      </View>
                      <Text style={styles.idFieldVal} numberOfLines={1}>{age || 'N/A'}</Text>
                      <View style={styles.idFieldRow}><Icon name="school" size={14} color="#1f2937" /><Text style={styles.idFieldKey}>Previous Attended School</Text></View>
                      <Text style={styles.idFieldVal} numberOfLines={2} ellipsizeMode="tail">{school}</Text>
                      <View style={styles.idFieldRow}><Icon name="call" size={14} color="#1f2937" /><Text style={styles.idFieldKey}>Phone</Text></View>
                      <Text style={styles.idFieldVal} numberOfLines={1} ellipsizeMode="middle">{phone}</Text>
                      <View style={{ marginTop: 6 }}>
                        <View style={styles.idFieldRow}><Icon name="home" size={14} color="#1f2937" /><Text style={styles.idFieldKey}>Address</Text></View>
                        <Text style={styles.idFieldVal} numberOfLines={3} ellipsizeMode="tail">{address}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>

              <Animated.View style={[styles.cardFace, styles.idCardBack, { transform: [{ rotateY: backRotate }] }]}>
                <LinearGradient colors={["#0b1a34", "#1e3a8a"]} style={styles.idHeader}> 
                  <View style={styles.idHeaderRow}>
                    <Text style={[styles.idSchoolName, { fontSize: 12 }]}>Card Information</Text>
                    <View style={styles.idHeaderRight}>
                      <Text style={styles.idTapHint}>Tap to flip</Text>
                      <Icon name="flip" size={16} color="#ffffff" />
                    </View>
                  </View>
                </LinearGradient>
                <View style={styles.idBackBody}>
                  <View style={styles.idPattern} pointerEvents="none">
                    <View style={styles.pCircle1} />
                    <View style={styles.pCircle2} />
                    <View style={styles.pCircle3} />
                    <View style={styles.pStripe1} />
                    <View style={styles.pStripe2} />
                    <View style={styles.pStripe3} />
                  </View>
                  <View style={styles.idBackSection}>
                    <Text style={styles.idBackTitle}>Owner</Text>
                    <Text style={styles.idBackText} numberOfLines={1} ellipsizeMode="tail">{name}</Text>
                  </View>
                  <View style={styles.idBackDivider} />
                  <View style={styles.idBackSection}>
                    <Text style={styles.idBackTitle}>Notice</Text>
                    <Text style={styles.idBackText}>This card is property of {occName}. If found, please Return to Owner.</Text>
                  </View>
                  <View style={styles.idBackDivider} />
                  <View style={styles.idBackSection}>
                    <Text style={styles.idBackTitle}>Emergency Contact</Text>
                    <View style={styles.idEmergencyRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={styles.idBackRow}>
                          <Text style={styles.idBackKey}>Name:</Text>
                          <Text style={styles.idBackValue} numberOfLines={1} ellipsizeMode="tail">{parentName || 'N/A'}</Text>
                        </View>
                        <View style={styles.idBackRow}>
                          <Text style={styles.idBackKey}>Phone:</Text>
                          <Text style={styles.idBackValue} numberOfLines={1} ellipsizeMode="middle">{parentPhone || 'N/A'}</Text>
                        </View>
                      </View>
                      <View style={styles.qrBox}>
                        <Image
                          source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https%3A%2F%2Foccadmission.site%2Flogin' }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                        <Text style={styles.qrCaption}>Scan to visit portal</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </View>
      <View style={styles.idActionsRow} pointerEvents="box-none">
          <TouchableOpacity onPress={handleDownload} style={[styles.idActionBtn, { backgroundColor: '#1f2937' }]}>
            <Icon name="download" size={16} color="#ffffff" />
            <Text style={styles.idActionText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={[styles.idActionBtn, { backgroundColor: '#374151' }]}>
            <Icon name="close" size={16} color="#ffffff" />
            <Text style={styles.idActionText}>Close</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    marginTop: 18,
  },
  modalGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingVertical: isShortScreen ? 12 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: isSmallScreen ? 36 : 40,
    height: isSmallScreen ? 36 : 40,
    borderRadius: isSmallScreen ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: isShortScreen ? 16 : 20,
    paddingBottom: Platform.OS === 'ios' ? (isShortScreen ? 40 : 60) : 40, // Extra padding for action buttons
  },
  profileSection: {
    marginBottom: isShortScreen ? 16 : 25,
  },
  profileCard: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  cardGradient: {
    padding: isSmallScreen ? 16 : 20,
    paddingBottom: isSmallScreen ? 18 : 22,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginRight: 15,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoButton: {
    marginTop: 4,
  },
  changePhotoText: {
    fontSize: 12,
    color: '#a855f7',
    fontWeight: '600',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  fieldsContainer: {
    gap: 14,
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)'
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a855f7',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)'
  },
  viewIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewIdButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    height: 50,
  },
  inputContainerFocused: {
    borderColor: '#667eea',
    borderWidth: 1,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  inputDisabledContainer: {
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)'
  },
  inputBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingHorizontal: 15,
    height: 50,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  inputContent: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlignVertical: 'center',
  },
  inputContentDisabled: {
    color: '#9ca3af',
  },
  textInputDisabled: {
    color: '#9ca3af',
  },
  valueContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  valueText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    lineHeight: 22,
  },
  genderContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  genderButtonSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: '#667eea',
    borderWidth: 2,
  },
  genderButtonError: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  genderButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  genderButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    gap: isSmallScreen ? 8 : 10,
    marginTop: isShortScreen ? 20 : 25,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    flex: 1,
    height: isShortScreen ? 44 : 50,
    borderRadius: isShortScreen ? 22 : 25,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonLarge: {
    flex: 1,
    borderRadius: isShortScreen ? 22 : 25,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    height: isShortScreen ? 44 : 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isSmallScreen ? 16 : 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // ID Card styles
  idModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  idModalContainer: {
    width: 520,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardRotateBox: {
    transform: [{ rotate: '90deg' }],
    marginBottom: 20,
    overflow: 'visible',
  },
  idCardContainer: {
    width: 476,
    height: 300,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 476,
    height: 300,
    backfaceVisibility: 'hidden',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  idCardFront: {
    backgroundColor: '#0b1a34',
  },
  idCardBack: {
    backgroundColor: '#0b1a34',
    transform: [{ rotateY: '180deg' }],
  },
  idHeader: {
    height: 70,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  idHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idTapHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 2,
  },
  idSchoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  idSchoolLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  idSchoolName: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  idSchoolSub: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 10,
  },
  idBody: {
    padding: 12,
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  idBodyScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 180,
  },
  idBackBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  idBackSection: {
    marginBottom: 6,
  },
  idBackTitle: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 11,
    marginBottom: 4,
  },
  idBackText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '600'
  },
  idBackRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  idEmergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idBackKey: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  idBackValue: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 180,
    marginLeft: 4,
  },
  idBackDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  idBackBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  signatureBox: {
    alignItems: 'center',
  },
  signatureLine: {
    height: 1,
    backgroundColor: '#9ca3af',
    width: 140,
  },
  signatureLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  barcodeBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f7',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bar: {
    height: 26,
    backgroundColor: '#111827',
  },
  qrBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 4,
  },
  qrImage: {
    width: 64,
    height: 64,
  },
  qrCaption: {
    marginTop: 4,
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
  },
  idPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  idWatermark: {
    position: 'absolute',
    top: -75,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.18,
  },
  idWatermarkSmall: {
    opacity: 0.10,
  },
  pCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -60,
    top: -60,
    backgroundColor: 'rgba(147, 197, 253, 0.12)',
  },
  pCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: 20,
    top: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  pCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    left: -30,
    bottom: -30,
    backgroundColor: 'rgba(191, 219, 254, 0.10)',
  },
  pStripe1: {
    position: 'absolute',
    left: -40,
    bottom: 20,
    width: 200,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
    transform: [{ rotate: '-8deg' }],
  },
  pStripe2: {
    position: 'absolute',
    left: -20,
    bottom: 40,
    width: 160,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.10)',
    transform: [{ rotate: '-8deg' }],
  },
  pStripe3: {
    position: 'absolute',
    left: 10,
    bottom: 60,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(29, 78, 216, 0.10)',
    transform: [{ rotate: '-8deg' }],
  },
  // only horizontal lines retained
  // horizontal grid lines removed
  idTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  idMainRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
  },
  idLeftCol: {
    width: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  idRightCol: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  idTwoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  idCol: {
    flex: 1,
  },
  idPhotoBox: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#0b1a34',
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
  },
  idPhoto: {
    width: 70,
    height: 70,
    borderRadius: 6,
  },
  idPhotoLarge: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  idName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0b1a34',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 18,
  },
  idRole: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '700',
    marginBottom: 6,
  },
  idDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  idFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  idFieldKey: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  idFieldVal: {
    fontSize: 12,
    color: '#0b1a34',
    fontWeight: '700',
    marginTop: 1,
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  idWaves: {
    position: 'relative',
    height: 36,
    marginTop: 12,
    overflow: 'hidden',
  },
  wave1: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: -12,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: '#e0e7ff',
  },
  wave2: {
    position: 'absolute',
    left: -30,
    right: -30,
    bottom: -16,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: '#bfdbfe',
  },
  wave3: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -20,
    height: 60,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: '#93c5fd',
  },
  idCloseBtn: {
    marginTop: 12,
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  idCloseText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  idActionsRow: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
  },
  idActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  idActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  // Fingerprint styles - Simplified
  fingerprintContainer: {
    marginTop: 16,
  },
  fingerprintRegisteredSimple: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  fingerprintActiveCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fingerprintIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fingerprintIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fingerprintStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  fingerprintStatusBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fingerprintStatusTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  fingerprintStatusSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  removeFingerprintButtonSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    marginTop: 8,
  },
  removeFingerprintTextSimple: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  fingerprintNotRegisteredSimple: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  fingerprintIconCircleInactive: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  fingerprintPromptTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  fingerprintPromptSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  registerFingerprintButtonSimple: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 180,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerFingerprintButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  registerFingerprintGradientSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  registerFingerprintTextSimple: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
