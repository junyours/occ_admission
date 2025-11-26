import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatBase64Image } from '../utils/imageUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageModal = ({ 
  visible, 
  imageUri, 
  onClose, 
  title = "Image Preview",
  showTitle = true 
}) => {
  if (!visible || !imageUri) return null;

  const formattedUri = formatBase64Image(imageUri);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        {showTitle && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Icon name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: formattedUri }}
            style={styles.image}
            resizeMode="contain"
            onError={(error) => {
              console.log('ImageModal - Image load error:', error);
            }}
            onLoad={() => {
              console.log('ImageModal - Image loaded successfully');
            }}
          />
        </View>

        {/* Close Instructions */}
        <View style={styles.footer}>
          <Text style={styles.instructionText}>
            Tap anywhere or use the close button to exit
          </Text>
        </View>

        {/* Invisible overlay for closing */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: screenWidth - 40,
    height: screenHeight * 0.7,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});

export default ImageModal;
