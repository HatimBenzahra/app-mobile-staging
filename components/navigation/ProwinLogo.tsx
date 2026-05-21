import { memo } from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

type Props = {
  size?: number;
};

function ProwinLogo({ size = 44 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="55 25 350 220"
      fill="none"
      accessibilityLabel="Pro-Win"
    >
      <Line
        x1={80}
        y1={95}
        x2={150}
        y2={95}
        stroke="#2F80FF"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Line
        x1={65}
        y1={130}
        x2={150}
        y2={130}
        stroke="#2F80FF"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Line
        x1={80}
        y1={165}
        x2={150}
        y2={165}
        stroke="#2F80FF"
        strokeWidth={14}
        strokeLinecap="round"
      />

      <Circle
        cx={280}
        cy={120}
        r={85}
        stroke="#005BFF"
        strokeWidth={24}
        fill="none"
      />
      <Line
        x1={340}
        y1={180}
        x2={395}
        y2={235}
        stroke="#005BFF"
        strokeWidth={24}
        strokeLinecap="round"
      />

      <Circle
        cx={280}
        cy={120}
        r={52}
        stroke="#001B5E"
        strokeWidth={10}
        fill="none"
      />

      <Line
        x1={280}
        y1={45}
        x2={280}
        y2={65}
        stroke="#001B5E"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Line
        x1={280}
        y1={175}
        x2={280}
        y2={195}
        stroke="#001B5E"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Line
        x1={205}
        y1={120}
        x2={225}
        y2={120}
        stroke="#001B5E"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Line
        x1={335}
        y1={120}
        x2={355}
        y2={120}
        stroke="#001B5E"
        strokeWidth={8}
        strokeLinecap="round"
      />

      <Circle cx={280} cy={102} r={16} fill="#001B5E" />
      <Path
        d="M248 145C248 127 262 116 280 116C298 116 312 127 312 145"
        fill="#001B5E"
      />
    </Svg>
  );
}

export default memo(ProwinLogo);
