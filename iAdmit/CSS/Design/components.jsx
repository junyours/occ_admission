import React from 'react';
import { View } from 'react-native';
import { Button as PaperButton, TextInput as PaperTextInput, HelperText, Text } from 'react-native-paper';

export const TextInput = ({ error, errorText, ...rest }) => (
  <View>
    <PaperTextInput mode="outlined" error={error} {...rest} />
    {!!errorText && <HelperText type="error">{errorText}</HelperText>}
  </View>
);

export const Button = (props) => (
  <PaperButton mode="contained" {...props} />
);

export const AlertBanner = ({ text, type = 'error' }) => (
  <Text variant="bodyMedium" style={{ color: type === 'error' ? '#D32F2F' : '#0288D1' }}>{text}</Text>
);
