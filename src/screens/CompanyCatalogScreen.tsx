import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import Button from '../components/Button';

// Mock de produtos cadastrados pela empresa
const MOCK_PRODUCTS = [
  { id: '1', name: 'Camiseta Boxy Heavyweight', price: 129.90, stock: 15, category: 'Streetwear', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=200' },
  { id: '2', name: 'Calça Cargo Utilitária', price: 259.00, stock: 8, category: 'Streetwear', image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=200' },
  { id: '3', name: 'Blazer Linho Minimal', price: 489.00, stock: 0, category: 'Elegante', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200' },
  { id: '4', name: 'Tênis Retro Runner', price: 320.00, stock: 22, category: 'Esportivo', image: 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?q=80&w=200' },
];

export default function CompanyCatalogScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const categories = ['Todos', 'Streetwear', 'Elegante', 'Esportivo', 'Casual'];

  // Lógica de Filtro e Busca
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'Todos' || item.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const renderProduct = ({ item }: { item: typeof MOCK_PRODUCTS[0] }) => (
    <View className="flex-row bg-surface border border-surface-4 rounded-card p-3 mb-4 items-center">
      <Image
        source={{ uri: item.image }}
        className="w-20 h-20 rounded-2xl bg-surface-4"
        resizeMode="cover"
      />

      <View className="flex-1 ml-4">
        <Text className="text-ink font-bold text-sm" numberOfLines={1}>{item.name}</Text>
        <Text className="text-brand font-bold mt-1">R$ {item.price.toFixed(2)}</Text>

        <View className="flex-row items-center mt-2">
          <View className={`w-2 h-2 rounded-full ${item.stock > 0 ? 'bg-success' : 'bg-danger'}`} />
          <Text className="text-ink-5 text-[10px] ml-2 uppercase font-bold tracking-widest">
            {item.stock > 0 ? `${item.stock} em estoque` : 'Sem estoque'}
          </Text>
        </View>
      </View>

      {/* Botões de Ação */}
      <View className="flex-row gap-2">
        <Button
          variant="icon"
          icon="create-outline"
          accessibilityLabel="Editar produto"
          onPress={() => navigation.navigate('ComingSoon', {
            title: 'Editar produto',
            description: 'Edição individual de peça publicada ainda não existe — por enquanto, gerencie pelo backend.',
            icon: 'create-outline',
          })}
        />
        <Button
          variant="icon"
          icon="bar-chart-outline"
          accessibilityLabel="Estatísticas do produto"
          onPress={() => navigation.navigate('ComingSoon', {
            title: 'Estatísticas da peça',
            description: 'Visualizações, curtidas e salvos por peça ainda não têm um endpoint agregado no backend.',
            icon: 'bar-chart-outline',
          })}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
          </TouchableOpacity>
          <Text className="text-ink text-xl font-bold">Seu Catálogo</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddProduct' as never)}>
            <Ionicons name="add-circle" size={28} color={colors.brand.DEFAULT} />
          </TouchableOpacity>
        </View>

        {/* Barra de Busca */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center bg-surface border border-surface-4 rounded-2xl px-4 h-14">
            <Ionicons name="search" size={20} color={colors.ink[5]} />
            <TextInput
              placeholder="Buscar por nome do produto..."
              placeholderTextColor={colors.ink[6]}
              className="flex-1 ml-3 text-ink font-medium"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.ink[5]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filtros de Categoria */}
        <View className="mt-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat}
                onPress={() => setFilter(cat)}
                className={`px-6 py-2.5 rounded-full border ${filter === cat ? 'bg-brand border-brand' : 'bg-surface border-surface-4'}`}
              >
                <Text className={`text-xs font-bold ${filter === cat ? 'text-white' : 'text-ink-4'}`}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Itens */}
        {filteredProducts.length > 0 ? (
          <FlatList 
            data={filteredProducts}
            keyExtractor={item => item.id}
            renderItem={renderProduct}
            contentContainerStyle={{ padding: 24, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="shirt-outline" size={48} color={colors.surface[5]} />
            <Text className="text-ink font-bold mt-4">Nenhum produto encontrado</Text>
            <Text className="text-ink-5 text-center mt-2 text-xs">Tente ajustar sua busca ou filtros.</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}