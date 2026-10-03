import { Image, useWindowDimensions } from 'react-native';

// Photo that always shows whole at its native aspect ratio (nothing cropped). The size is
// computed in pixels from the window width because `width: '100%'` + `aspectRatio` does
// not resolve reliably inside ScrollView/FlatList content on web.
export function ResponsiveImage({ source, ratio, inset = 0, style, ...imageProps }) {
  const { width } = useWindowDimensions();
  const imageWidth = width - inset * 2;
  return (
    <Image
      source={source}
      resizeMode="cover"
      style={[{ width: imageWidth, height: Math.round(imageWidth / ratio), alignSelf: 'center' }, style]}
      {...imageProps}
    />
  );
}
