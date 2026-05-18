import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';

interface UIProps {
  bodyCount: number;
  bhMass: number;
  simSpeed: number;
  onSpeedChange: (speed: number) => void;
  onSpawnPlanet: () => void;
  onSpawnStar: () => void;
  onSpawnComet: () => void;
  onClear: () => void;
  onUnlock: () => void;
  isUnlocked: boolean;
  trailColor: string;
  onTrailColorChange: (color: string) => void;
}

export default function UI({
  bodyCount,
  bhMass,
  simSpeed,
  onSpeedChange,
  onSpawnPlanet,
  onSpawnStar,
  onSpawnComet,
  onClear,
  onUnlock,
  isUnlocked,
  trailColor,
  onTrailColorChange,
}: UIProps) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(simSpeed);

  const handleSpeedChange = (value: number) => {
    setLocalSpeed(value);
    onSpeedChange(value);
  };

  const randomColor = () => {
    const c = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    onTrailColorChange(c);
  };

  return (
    <>
<View style={styles.topBar}>
          <Text style={styles.title}>BLACK HOLE</Text>
          <View style={styles.statsChip}>
            <Text style={styles.statsText}>
              天體 <Text style={styles.statValue}>{bodyCount}</Text> · 質量 <Text style={styles.statValue}>{bhMass}</Text>
            </Text>
          </View>
        </View>

      <View style={styles.hint}>
        <Text style={styles.hintText}>拖曳旋轉 · 捏合縮放 / Drag · Pinch to zoom</Text>
      </View>

      <View style={styles.bottomTray}>
          <View style={styles.spawnRow}>
            <TouchableOpacity style={styles.spawnBtn} onPress={onSpawnPlanet}>
              <Text style={styles.spawnIcon}>🪐</Text>
              <Text style={styles.spawnZh}>行星</Text>
              <Text style={styles.spawnEn}>Planet</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.spawnBtn} onPress={onSpawnStar}>
              <Text style={styles.spawnIcon}>⭐</Text>
              <Text style={styles.spawnZh}>恆星</Text>
              <Text style={styles.spawnEn}>Star</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.spawnBtn} onPress={onSpawnComet}>
              <Text style={styles.spawnIcon}>☄️</Text>
              <Text style={styles.spawnZh}>彗星</Text>
              <Text style={styles.spawnEn}>Comet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ctrlRow}>
            <View style={styles.speedWrap}>
              <View style={styles.speedLabel}>
                <Text style={styles.speedLabelText}>模擬速度 Speed</Text>
                <Text style={styles.speedValue}>{localSpeed.toFixed(1)}×</Text>
              </View>
              <View style={styles.sliderContainer}>
                <View
                  style={[
                    styles.sliderTrack,
                    { width: `${((localSpeed - 0.1) / (5 - 0.1)) * 100}%` }
                  ]}
                />
                <View style={styles.sliderTouchArea}>
                  <View style={styles.sliderThumb} />
                </View>
                <View
                  style={styles.sliderInput}
                  onTouchStart={(e) => {
                    const x = e.nativeEvent.locationX;
                    const width = 280;
                    const newSpeed = Math.max(0.1, Math.min(5, 0.1 + (x / width) * (5 - 0.1)));
                    handleSpeedChange(Math.round(newSpeed * 10) / 10);
                  }}
                  onTouchMove={(e) => {
                    const x = e.nativeEvent.locationX;
                    const width = 280;
                    const newSpeed = Math.max(0.1, Math.min(5, 0.1 + (x / width) * (5 - 0.1)));
                    handleSpeedChange(Math.round(newSpeed * 10) / 10);
                  }}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.iconBtn} onPress={onClear}>
              <Text style={styles.iconBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>

          {!isUnlocked && (
            <TouchableOpacity style={styles.unlockBtn} onPress={() => setShowPayModal(true)}>
              <View style={styles.unlockLeft}>
                <Text style={styles.gem}>💎</Text>
                <View>
                  <Text style={styles.unlockZh}>解鎖自訂尾跡顏色</Text>
                  <Text style={styles.unlockEn}>Unlock Custom Trail Colors</Text>
                </View>
              </View>
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>NT$99</Text>
              </View>
            </TouchableOpacity>
          )}

          {isUnlocked && (
            <View style={styles.colorRow}>
              <Text style={styles.colorLabel}>尾跡色 Trail</Text>
              <View
                style={[styles.colorPicker, { backgroundColor: trailColor }]}
                onTouchStart={(e) => {
                  const x = e.nativeEvent.locationX;
                  const y = e.nativeEvent.locationY;
                }}
              />
              <TouchableOpacity style={styles.randomBtn} onPress={randomColor}>
                <Text style={styles.randomBtnText}>🎲 隨機 Random</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      <Modal
        visible={showPayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPayModal(false)}
        >
          <View style={styles.paySheet}>
            <View style={styles.payHandle} />
            <View style={styles.payHeader}>
              <View>
                <Text style={styles.payTitleZh}>解鎖進階功能</Text>
                <Text style={styles.payTitleEn}>Unlock Premium Features</Text>
              </View>
              <TouchableOpacity style={styles.payClose} onPress={() => setShowPayModal(false)}>
                <Text style={styles.payCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎨</Text>
                <View>
                  <Text style={styles.featureZh}>自訂每個天體尾跡顏色</Text>
                  <Text style={styles.featureEn}>Custom trail color per celestial body</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎲</Text>
                <View>
                  <Text style={styles.featureZh}>隨機顏色一鍵套用</Text>
                  <Text style={styles.featureEn}>One-tap random color randomizer</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>♾️</Text>
                <View>
                  <Text style={styles.featureZh}>永久解鎖，一次付款</Text>
                  <Text style={styles.featureEn}>Permanent unlock · One-time payment</Text>
                </View>
              </View>
            </View>

            <View style={styles.priceBlock}>
              <View>
                <Text style={styles.priceAmount}>NT$99</Text>
                <Text style={styles.priceSub}>一次付款，終身使用{'\n'}<Text style={styles.priceSubSpan}>One-time · Lifetime access</Text></Text>
              </View>
              <View style={styles.payMethods}>
                <Text style={styles.payMethod}>💳</Text>
                <Text style={styles.payMethod}>📱</Text>
                <Text style={styles.payMethod}>🏦</Text>
              </View>
            </View>

            <View style={styles.payActions}>
              <TouchableOpacity
                style={styles.payConfirm}
                onPress={() => {
                  setShowPayModal(false);
                  onUnlock();
                }}
              >
                <Text style={styles.payConfirmText}>立即解鎖 · UNLOCK NOW</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.payCancel}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={styles.payCancelText}>稍後再說 · Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.toast}>
        <Text style={styles.toastText}>✅ 解鎖成功！Trail colors unlocked!</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 40 : 14,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.12,
    color: '#4af',
  },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  statsText: {
    fontSize: 11,
    color: 'rgba(180,210,255,0.45)',
  },
  statValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#4af',
    fontSize: 11,
  },
  hint: {
    position: 'absolute',
    bottom: 280,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintText: {
    fontSize: 10,
    color: 'rgba(100,180,255,0.25)',
    letterSpacing: 0.06,
  },
  bottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bottomTray: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(0,0,20,0.97)',
  },
  spawnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  spawnBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(5,5,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 18,
  },
  spawnIcon: {
    fontSize: 22,
  },
  spawnZh: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ddeeff',
    marginTop: 4,
  },
  spawnEn: {
    fontSize: 9,
    color: 'rgba(180,210,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  ctrlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  speedWrap: {
    flex: 1,
    backgroundColor: 'rgba(5,5,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 18,
    padding: 10,
  },
  speedLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  speedLabelText: {
    fontSize: 10,
    color: 'rgba(180,210,255,0.45)',
  },
  speedValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    color: '#4af',
  },
  sliderContainer: {
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#4af',
    borderRadius: 2,
    left: 0,
  },
  sliderTouchArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    justifyContent: 'center',
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4af',
    alignSelf: 'center',
    marginLeft: 0,
    shadowColor: '#4af',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  sliderInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    opacity: 0,
  },
  iconBtn: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(5,5,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 20,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    backgroundColor: 'rgba(255,200,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,68,0.35)',
    borderRadius: 18,
  },
  unlockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gem: {
    fontSize: 22,
  },
  unlockZh: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ffc844',
  },
  unlockEn: {
    fontSize: 10,
    color: 'rgba(255,200,68,0.6)',
  },
  priceTag: {
    backgroundColor: 'rgba(255,200,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,68,0.3)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  priceText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffc844',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  colorLabel: {
    fontSize: 11,
    color: 'rgba(180,210,255,0.45)',
  },
  colorPicker: {
    width: 44,
    height: 36,
    borderRadius: 10,
  },
  randomBtn: {
    flex: 1,
    padding: 9,
    backgroundColor: 'rgba(5,5,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 12,
    alignItems: 'center',
  },
  randomBtnText: {
    fontSize: 11,
    color: '#ddeeff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,10,0.85)',
    justifyContent: 'flex-end',
  },
  paySheet: {
    backgroundColor: '#080820',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.2)',
    borderBottomWidth: 0,
    borderRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  payHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(100,180,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 14,
  },
  payHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 0,
  },
  payTitleZh: {
    fontSize: 20,
    fontWeight: '500',
    color: '#fff',
  },
  payTitleEn: {
    fontSize: 12,
    color: 'rgba(180,210,255,0.45)',
    marginTop: 2,
  },
  payClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payCloseText: {
    fontSize: 16,
    color: '#fff',
  },
  features: {
    margin: 20,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.12)',
    borderRadius: 14,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  featureZh: {
    fontSize: 13,
    fontWeight: '500',
  },
  featureEn: {
    fontSize: 10,
    color: 'rgba(180,210,255,0.45)',
    marginTop: 1,
  },
  priceBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 4,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(255,200,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,68,0.25)',
    borderRadius: 16,
  },
  priceAmount: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 28,
    fontWeight: '900',
    color: '#ffc844',
  },
  priceSub: {
    fontSize: 11,
    color: 'rgba(180,210,255,0.45)',
    marginTop: 2,
  },
  priceSubSpan: {
    color: 'rgba(255,200,68,0.7)',
  },
  payMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  payMethod: {
    width: 44,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 18,
  },
  payActions: {
    paddingHorizontal: 24,
    gap: 10,
  },
  payConfirm: {
    padding: 16,
    backgroundColor: 'linear-gradient(135deg,#ffc844,#ff8c44)',
    borderRadius: 16,
    alignItems: 'center',
  },
  payConfirmText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 14,
    fontWeight: '700',
    color: '#1a0a00',
    letterSpacing: 0.06,
  },
  payCancel: {
    padding: 13,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 16,
    alignItems: 'center',
  },
  payCancelText: {
    fontSize: 13,
    color: 'rgba(180,210,255,0.45)',
  },
  toast: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  toastText: {
    backgroundColor: 'rgba(50,255,150,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(50,255,150,0.4)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 13,
    color: '#5f9',
  },
});