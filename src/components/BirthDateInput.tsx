import React from 'react';
import {
  TextInput,
  View,
} from 'react-native';
import Text from './Text';
import { colors } from '../theme/colors';

interface BirthDateInputProps {
  day: string;
  month: string;
  year: string;
  onChangeDay: (v: string) => void;
  onChangeMonth: (v: string) => void;
  onChangeYear: (v: string) => void;
}

/** Dia/mês/ano em três campos numéricos — ver utils/birthDate.ts para o porquê
 *  de não usar um date-picker nativo. Usado no cadastro de usuário e de loja:
 *  os dois criam uma linha em `profiles`, que exige `birth_date`. */
export default function BirthDateInput({
  day, month, year, onChangeDay, onChangeMonth, onChangeYear,
}: BirthDateInputProps): React.ReactElement {
  return (
    <View>
      <Text className="text-ink text-sm font-sans-bold mb-2 ml-1">
        Data de nascimento
      </Text>
      <View className="flex-row gap-x-3">
        <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 h-14 justify-center flex-1">
          <TextInput
            className="text-ink font-sans-medium text-center"
            placeholder="DD"
            placeholderTextColor={colors.ink[6]}
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            onChangeText={onChangeDay}
          />
        </View>
        <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 h-14 justify-center flex-1">
          <TextInput
            className="text-ink font-sans-medium text-center"
            placeholder="MM"
            placeholderTextColor={colors.ink[6]}
            keyboardType="number-pad"
            maxLength={2}
            value={month}
            onChangeText={onChangeMonth}
          />
        </View>
        <View className="bg-surface border border-b-2 border-surface-5 border-b-ink px-4 h-14 justify-center flex-[1.4]">
          <TextInput
            className="text-ink font-sans-medium text-center"
            placeholder="AAAA"
            placeholderTextColor={colors.ink[6]}
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={onChangeYear}
          />
        </View>
      </View>
    </View>
  );
}
