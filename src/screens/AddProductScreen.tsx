import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fetchCategories } from '../lib/categories';
import { CategoryResponse } from '../types/api';
import Button from '../components/Button';

const MEDIA_COMING_SOON = {
  title: 'Upload de mídia',
  description: 'Publicar peças precisa de um seletor de foto/vídeo e um bucket de armazenamento — nenhum dos dois existe no app ainda.',
  icon: 'cloud-upload-outline',
};

const STYLE_OPTIONS = ['Streetwear', 'Casual', 'Minimalista', 'Luxo', 'Vintage', 'Esportivo', 'Boho', 'Y2K'];
const SIZE_OPTIONS = ['P', 'M', 'G', 'GG', '38', '40', '42', '44'];

export default function AddProductScreen(): React.ReactElement {
  const [video, setVideo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          {/* Header Fixo */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-4">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-ink-4">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-ink font-bold text-lg">Novo Produto</Text>
            <View className="w-10" /> 
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* Seção de Upload de Vídeo (O Coração do App) */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ComingSoon', MEDIA_COMING_SOON)}
              className="mx-6 mt-6 h-80 rounded-[40px] bg-surface border-2 border-dashed border-brand/30 items-center justify-center overflow-hidden"
            >
              {video ? (
                <View className="items-center">
                   <Ionicons name="play-circle" size={50} color={colors.brand.DEFAULT} />
                   <Text className="text-ink font-bold mt-2">Vídeo selecionado</Text>
                </View>
              ) : (
                <View className="items-center px-10">
                  <View className="w-16 h-16 bg-brand/10 rounded-full items-center justify-center mb-4">
                    <Ionicons name="videocam" size={30} color={colors.brand.DEFAULT} />
                  </View>
                  <Text className="text-ink font-bold text-center">Subir vídeo do produto</Text>
                  <Text className="text-ink-5 text-xs text-center mt-2">
                    Dê preferência a vídeos 9:16 (vertical) de até 30 segundos.
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="px-6 mt-8 gap-y-6">
              
              {/* Info Básica */}
              <InputField 
                label="Título do Produto" 
                placeholder="Ex: Jaqueta Bomber Oversized" 
                value={name}
                onChange={setName}
              />

              <View className="flex-row gap-x-4">
                <View className="flex-1">
                  <InputField 
                    label="Preço (R$)" 
                    placeholder="0,00" 
                    keyboardType="numeric"
                    value={price}
                    onChange={setPrice}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-ink-5 text-[10px] font-bold uppercase mb-2 ml-1 tracking-widest">Estoque Inicial</Text>
                  <View className="bg-surface border border-surface-4 rounded-2xl px-4 flex-row items-center h-14">
                    <TextInput className="text-ink font-medium flex-1" placeholder="Qtd" placeholderTextColor={colors.ink[6]} keyboardType="numeric" />
                  </View>
                </View>
              </View>

              {/* Categoria (GET /api/categories) — obrigatória: todo look precisa de category_id */}
              <View>
                <Text className="text-ink font-bold mb-1">Categoria</Text>
                <Text className="text-ink-5 text-[10px] uppercase tracking-widest mb-3">Obrigatório</Text>
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-full border ${categoryId === cat.id ? 'bg-brand border-brand' : 'bg-surface border-surface-4'}`}
                    >
                      <Text className={`text-xs ${categoryId === cat.id ? 'text-white font-bold' : 'text-ink-4'}`}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tags de Estilo (Algoritmo) */}
              <View>
                <Text className="text-ink font-bold mb-1">Tags de Estilo</Text>
                <Text className="text-ink-5 text-[10px] uppercase tracking-widest mb-3">Isso define quem verá seu produto</Text>
                <View className="flex-row flex-wrap gap-2">
                  {STYLE_OPTIONS.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleSelection(tag, selectedTags, setSelectedTags)}
                      className={`px-4 py-2 rounded-full border ${selectedTags.includes(tag) ? 'bg-brand border-brand' : 'bg-surface border-surface-4'}`}
                    >
                      <Text className={`text-xs ${selectedTags.includes(tag) ? 'text-white font-bold' : 'text-ink-4'}`}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tamanhos Disponíveis */}
              <View>
                <Text className="text-ink font-bold mb-3">Tamanhos</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SIZE_OPTIONS.map(size => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => toggleSelection(size, selectedSizes, setSelectedSizes)}
                      className={`w-12 h-12 items-center justify-center rounded-xl border ${selectedSizes.includes(size) ? 'bg-ink border-ink' : 'bg-surface border-surface-4'}`}
                    >
                      <Text className={`font-bold ${selectedSizes.includes(size) ? 'text-background' : 'text-ink'}`}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <InputField 
                label="Descrição Detalhada" 
                placeholder="Fale sobre o tecido, caimento e detalhes..." 
                multiline
                value={description}
                onChange={setDescription}
              />

              {/* Botão de Publicar — leva pra "Em breve" até existir upload de
                  mídia; sem isso não há como cumprir o 1-6 fotos que
                  POST /api/looks exige. */}
              <View className="mt-4 mb-10">
                <Button
                  variant="primary"
                  label="Publicar no Feed"
                  icon="rocket-outline"
                  onPress={() => navigation.navigate('ComingSoon', MEDIA_COMING_SOON)}
                />
              </View>

            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({ label, placeholder, value, onChange, keyboardType = 'default', multiline = false }: any) {
  return (
    <View>
      <Text className="text-ink-5 text-[10px] font-bold uppercase mb-2 ml-1 tracking-widest">{label}</Text>
      <View className={`bg-surface border border-surface-4 rounded-2xl px-4 justify-center ${multiline ? 'py-4 h-32' : 'h-14'}`}>
        <TextInput
          className="text-ink font-medium"
          placeholder={placeholder}
          placeholderTextColor={colors.ink[6]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}