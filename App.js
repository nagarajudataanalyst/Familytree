import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Image,
  SafeAreaView, Modal, TextInput, ScrollView, Dimensions, Alert
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = 230;
const ORBIT_RADIUS = 115;

const INITIAL_DATA = {
  '1': {
    id: '1',
    name: 'Patriarch (Root)',
    photo: 'https://randomuser.me',
    spouses: ['2', '3'],
    children: [
      { id: '4', motherId: '2' },
      { id: '5', motherId: '2' },
      { id: '6', motherId: '3' }
    ]
  },
  '2': { id: '2', name: 'First Wife', photo: 'https://randomuser.me', spouses: [], children: [] },
  '3': { id: '3', name: 'Second Wife', photo: 'https://randomuser.me', spouses: [], children: [] },
  '4': { id: '4', name: 'Eldest Son', photo: 'https://randomuser.me', spouses: [], children: [] },
  '5': { id: '5', name: 'Daughter', photo: 'https://randomuser.me', spouses: [], children: [] },
  '6': { id: '6', name: 'Younger Son', photo: 'https://randomuser.me', spouses: [], children: [] }
};

export default function App() {
  const [members, setMembers] = useState(INITIAL_DATA);
  const [history, setHistory] = useState(['1']);
  const [selectedSpouse, setSelectedSpouse] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [relationType, setRelationType] = useState('SPOUSE');
  const [newName, setNewName] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);
  const [motherId, setMotherId] = useState('');

  const currentId = history[history.length - 1];
  const currentPerson = members[currentId] || INITIAL_DATA['1'];

  useEffect(() => {
    AsyncStorage.getItem('family_tree_v1').then(saved => {
      if (saved) setMembers(JSON.parse(saved));
    });
  }, []);

  const saveTree = async (updated) => {
    setMembers(updated);
    await AsyncStorage.setItem('family_tree_v1', JSON.stringify(updated));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect:[1,1],
      quality: 0.7,
    });
    if (!result.canceled) setNewPhoto(result.assets[0].uri);
  };

  const handleAddMember = () => {
    if (!newName.trim()) return Alert.alert('Name required', 'Please enter a name.');
    const newId = Date.now().toString();
    const photoUri = newPhoto || 'https://randomuser.me';

    const updated = {
      ...members,
      [newId]: { id: newId, name: newName.trim(), photo: photoUri, spouses: [], children: [] }
    };

    if (relationType === 'SPOUSE') {
      updated[currentId].spouses = [...updated[currentId].spouses, newId];
    } else {
      updated[currentId].children = [
        ...updated[currentId].children,
        { id: newId, motherId: motherId || updated[currentId].spouses[0] || '' }
      ];
    }

    saveTree(updated);
    setNewName('');
    setNewPhoto(null);
    setModalVisible(false);
  };

  const selectChild = (childId) => {
    setSelectedSpouse(null);
    setHistory([...history, childId]);
  };

  const jumpToBreadcrumb = (index) => {
    setSelectedSpouse(null);
    setHistory(history.slice(0, index + 1));
  };

  const spouses = currentPerson.spouses.map(id => members[id]).filter(Boolean);
  const visibleChildren = currentPerson.children
    .filter(c => !selectedSpouse || c.motherId === selectedSpouse)
    .map(c => members[c.id])
    .filter(Boolean);

  const spousePositions = spouses.map((spouse, index) => {
    const count = spouses.length;
    const startAngle = -155 * (Math.PI / 180);
    const endAngle = -25 * (Math.PI / 180);
    const angle = count === 1
      ? -90 * (Math.PI / 180)
      : startAngle + (index * (endAngle - startAngle)) / (count - 1);

    return {
      ...spouse,
      x: CENTER_X + ORBIT_RADIUS * Math.cos(angle),
      y: CENTER_Y + ORBIT_RADIUS * Math.sin(angle)
    };
  });

  const childY = CENTER_Y + 185;
  const childSpacing = Math.min(95, (width - 60) / Math.max(visibleChildren.length, 1));
  const startChildX = CENTER_X - ((visibleChildren.length - 1) * childSpacing) / 2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.breadcrumbBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {history.map((id, idx) => (
            <TouchableOpacity key={id + idx} onPress={() => jumpToBreadcrumb(idx)} style={styles.crumbItem}>
              <Text style={styles.crumbText}>
                {members[id]?.name} {idx < history.length - 1 ? ' › ' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.canvas}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_RADIUS} stroke="#334155" strokeDasharray="4,4" strokeWidth="1.5" fill="none" />
          {spousePositions.map(sp => (
            <Line key={sp.id} x1={CENTER_X} y1={CENTER_Y} x2={sp.x} y2={sp.y} stroke={selectedSpouse === sp.id ? '#38bdf8' : '#64748b'} strokeWidth="2" />
          ))}
          {visibleChildren.map((child, idx) => {
            const cx = startChildX + idx * childSpacing;
            return (
              <Line key={child.id} x1={CENTER_X} y1={CENTER_Y} x2={cx} y2={childY} stroke="#94a3b8" strokeWidth="2" />
            );
          })}
        </Svg>

        {spousePositions.map(sp => {
          const isSelected = selectedSpouse === sp.id;
          return (
            <TouchableOpacity
              key={sp.id}
              onPress={() => setSelectedSpouse(isSelected ? null : sp.id)}
              style={[styles.nodeWrapper, { left: sp.x - 32, top: sp.y - 32 }]}
            >
              <Image source={{ uri: sp.photo }} style={[styles.spouseAvatar, isSelected && styles.activeSpouse]} />
              <Text style={styles.nodeLabel} numberOfLines={1}>{sp.name}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setSelectedSpouse(null)}
          style={[styles.nodeWrapper, { left: CENTER_X - 44, top: CENTER_Y - 44 }]}
        >
          <Image source={{ uri: currentPerson.photo }} style={styles.focalAvatar} />
          <Text style={styles.focalLabel}>{currentPerson.name}</Text>
        </TouchableOpacity>

        {visibleChildren.map((child, idx) => {
          const cx = startChildX + idx * childSpacing;
          return (
            <TouchableOpacity
              key={child.id}
              onPress={() => selectChild(child.id)}
              style={[styles.nodeWrapper, { left: cx - 32, top: childY - 32 }]}
            >
              <Image source={{ uri: child.photo }} style={styles.childAvatar} />
              <Text style={styles.nodeLabel} numberOfLines={1}>{child.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => { setRelationType('SPOUSE'); setModalVisible(true); }}
        >
          <Text style={styles.btnText}>+ Add Wife / Spouse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => { setRelationType('CHILD'); setMotherId(spouses[0]?.id || ''); setModalVisible(true); }}
        >
          <Text style={styles.btnText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add {relationType === 'SPOUSE' ? 'Spouse' : 'Child'}</Text>
            <TouchableOpacity onPress={pickImage} style={styles.photoPicker}>
              {newPhoto ? (
                <Image source={{ uri: newPhoto }} style={styles.previewImg} />
              ) : (
                <Text style={styles.photoPickerText}>Tap to Choose Photo</Text>
              )}
            </TouchableOpacity>
            <TextInput
              placeholder="Enter Full Name"
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
            {relationType === 'CHILD' && spouses.length > 0 && (
              <View style={styles.motherRow}>
                <Text style={styles.subLabel}>Mother:</Text>
                {spouses.map(sp => (
                  <TouchableOpacity
                    key={sp.id}
                    onPress={() => setMotherId(sp.id)}
                    style={[styles.chip, motherId === sp.id && styles.chipActive]}
                  >
                    <Text style={styles.chipText}>{sp.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddMember} style={styles.saveBtn}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  breadcrumbBar: {
    padding: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbText: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 14,
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  nodeWrapper: {
    position: 'absolute',
    alignItems: 'center',
    width: 88,
  },
  focalAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#f59e0b',
  },
  spouseAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#38bdf8',
  },
  activeSpouse: {
    borderColor: '#f43f5e',
    borderWidth: 3.5,
  },
  childAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  focalLabel: {
    color: '#f8fafc',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  nodeLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1e293b',
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0284c7',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoPicker: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#334155',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  photoPickerText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    padding: 8,
  },
  previewImg: {
    width: 90,
    height: 90,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  motherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  subLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#0284c7',
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#475569',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
});