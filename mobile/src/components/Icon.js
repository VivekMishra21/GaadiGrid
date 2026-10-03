import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '../theme/colors';
import { ICON_PATHS } from './iconPaths';

const TAGS = { path: Path, circle: Circle, rect: Rect, polygon: Polygon, line: Line };

// Decorative by default: every place that uses an icon also shows a text label.
export function Icon({ name, size = 22, color = colors.textPrimary, strokeWidth = 2, fill = 'none' }) {
  const nodes = ICON_PATHS[name];
  if (!nodes) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {nodes.map(([tag, attrs], i) => {
        const Tag = TAGS[tag];
        return Tag ? <Tag key={i} {...attrs} fill={fill === 'none' ? undefined : fill} /> : null;
      })}
    </Svg>
  );
}
