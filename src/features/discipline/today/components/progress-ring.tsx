import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '@/theme';

const SIZE = 64;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A simple ring that fills up as tasks get done. Shows "done / total" in the middle.
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const fraction = total === 0 ? 0 : Math.min(done / total, 1);

  return (
    <View style={styles.wrap} accessibilityLabel={`${done} of ${total} done`}>
      {/* Turned a quarter turn, so the ring starts filling from the top instead of the right. */}
      <View style={styles.turn}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.primarySoft} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
          />
        </Svg>
      </View>
      <Text style={styles.label}>
        {done}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  turn: { transform: [{ rotate: '-90deg' }] },
  label: { position: 'absolute', fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
});
