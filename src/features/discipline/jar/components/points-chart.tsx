import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import type { MonthlyTotal } from '@/features/discipline/jar/jar-logic';
import { colors, fonts, radius } from '@/theme';

const WIDTH = 320;
const HEIGHT = 150;
const PAD_X = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 26;

// A line of the points earned in each month (last 6 months at most).
export function PointsChart({ months }: { months: MonthlyTotal[] }) {
  if (months.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Points earned each month</Text>
        <Text style={styles.empty}>Check off tasks in Today and your monthly points will show up here.</Text>
      </View>
    );
  }

  const maxTotal = Math.max(...months.map((month) => month.total), 1);
  const baseY = HEIGHT - PAD_BOTTOM;
  const stepX = months.length > 1 ? (WIDTH - PAD_X * 2) / (months.length - 1) : 0;
  // With one month there is only one dot, so we put it in the middle.
  const startX = months.length > 1 ? PAD_X : WIDTH / 2;
  const points = months.map((month, index) => ({
    x: startX + index * stepX,
    y: baseY - (month.total / maxTotal) * (baseY - PAD_TOP),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Points earned each month</Text>
      <Svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ aspectRatio: WIDTH / HEIGHT }}>
        <Line x1={PAD_X / 2} y1={baseY} x2={WIDTH - PAD_X / 2} y2={baseY} stroke={colors.border} strokeWidth={1} />
        {points.length > 1 && (
          <Polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((point, index) => (
          <Circle key={months[index].key} cx={point.x} cy={point.y} r={4} fill={colors.primary} />
        ))}
        {points.map((point, index) => (
          <SvgText
            key={`value-${months[index].key}`}
            x={point.x}
            y={point.y - 10}
            fontSize={12}
            fill={colors.text}
            textAnchor="middle">
            {months[index].total}
          </SvgText>
        ))}
        {points.map((point, index) => (
          <SvgText
            key={`label-${months[index].key}`}
            x={point.x}
            y={HEIGHT - 8}
            fontSize={11}
            fill={colors.textMuted}
            textAnchor="middle">
            {months[index].label.slice(0, 3)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { marginBottom: 8, fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  empty: { marginTop: 0, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.textMuted },
});
