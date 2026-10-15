import { blobatar } from 'blobatar';
import { SvgXml } from 'react-native-svg';

const MAIKEL_XML = blobatar('maikel');

export function MaikelAvatar({ size = 36 }: { size?: number }) {
  return <SvgXml xml={MAIKEL_XML} width={size} height={size} accessibilityLabel="Maikel" />;
}
