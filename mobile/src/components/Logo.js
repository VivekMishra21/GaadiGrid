import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

export function Logo({ size = 64, pinColor = '#102A43' }) {
  // Purely decorative — every place this is used (LogoWordmark) already shows the
  // "GaadiGrid" name as real, visible text right next to it, so a screen reader
  // shouldn't announce this icon separately.
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessible={false} importantForAccessibility="no-hide-descendants">
      <Path
        d="M512,140
          C 654,140 764,251 764,392
          C 764,520 640,700 560,830
          C 542,858 527,884 512,924
          C 497,884 482,858 464,830
          C 384,700 260,520 260,392
          C 260,251 370,140 512,140
          Z"
        fill={pinColor}
      />

      <G transform="translate(512,340)">
        <Rect x={-96} y={34} width={192} height={46} rx={23} fill="#18A875" />
        <Rect x={-72} y={46} width={40} height={10} rx={5} fill="#EAF6F0" />
        <Rect x={-8} y={46} width={40} height={10} rx={5} fill="#EAF6F0" />
        <Rect x={56} y={46} width={40} height={10} rx={5} fill="#EAF6F0" />

        <G transform="translate(-48,-94) rotate(-28)" fill="#FF8A34">
          <Rect x={-40} y={-70} width={80} height={50} rx={20} />
          <Rect x={0} y={-26} width={16} height={34} rx={8} />
          <Rect x={-16} y={0} width={32} height={130} rx={16} />
          <Circle cx={0} cy={138} r={11} />
        </G>

        <Path
          d="M108,-158 L124,-118 L164,-102 L124,-86 L108,-46 L92,-86 L52,-102 L92,-118 Z"
          fill="#18A875"
        />
        <Path
          d="M150,-40 L158,-22 L176,-14 L158,-6 L150,12 L142,-6 L124,-14 L142,-22 Z"
          fill="#18A875"
          opacity={0.7}
        />
      </G>
    </Svg>
  );
}
