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
  playerMass?: number;
  playerAbsorbed?: number;
  gameState?: 'idle' | 'playing' | 'won' | 'lost';
  score?: number;
  onRestart?: () => void;
  highScore?: number;
  gamesPlayed?: number;
  onShowStats?: () => void;
  difficulty?: 'easy' | 'normal' | 'hard';
  onDifficultyChange?: (difficulty: 'easy' | 'normal' | 'hard') => void;
  zoomLevel?: number;
  hintText?: string;
  showHint?: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onUpgradePurchase?: (type: 'mass' | 'speed', amount: number) => void;
  massLevel?: number;
  speedLevel?: number;
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
  playerMass = 0,
  playerAbsorbed = 0,
  gameState = 'idle',
  score = 0,
  onRestart,
  highScore = 0,
  gamesPlayed = 0,
  onShowStats,
  difficulty = 'normal',
  onDifficultyChange,
  zoomLevel = 0.5,
  hintText = '',
  showHint = false,
  isPaused = false,
  onPause,
  onUpgradePurchase,
  massLevel = 0,
  speedLevel = 0,
}: UIProps) {
  const MAX_UPGRADE_LEVEL = 5;
  const [showPayModal, setShowPayModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
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
          <View style={styles.topRightRow}>
            <TouchableOpacity style={styles.scoreChip} onPress={() => setShowStatsModal(true)}>
              <Text style={styles.scoreChipLabel}>分</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </TouchableOpacity>
            <View style={styles.statsChip}>
              <Text style={styles.statsText}>
                玩家 <Text style={styles.statValue}>{playerAbsorbed}</Text> · 質量 <Text style={styles.statValue}>{bhMass}</Text>
              </Text>
            </View>
            {gameState === 'playing' && (
              <TouchableOpacity style={styles.pauseBtn} onPress={() => onPause?.()}>
                <Text style={styles.pauseBtnText}>⏸</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      <View style={styles.hint}>
        <View style={styles.difficultyRow}>
          <TouchableOpacity
            style={[styles.diffBtn, difficulty === 'easy' && styles.diffBtnActive]}
            onPress={() => onDifficultyChange?.('easy')}
          >
            <Text style={[styles.diffBtnText, difficulty === 'easy' && styles.diffBtnTextActive]}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diffBtn, difficulty === 'normal' && styles.diffBtnActive]}
            onPress={() => onDifficultyChange?.('normal')}
          >
            <Text style={[styles.diffBtnText, difficulty === 'normal' && styles.diffBtnTextActive]}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diffBtn, difficulty === 'hard' && styles.diffBtnActive]}
            onPress={() => onDifficultyChange?.('hard')}
          >
            <Text style={[styles.diffBtnText, difficulty === 'hard' && styles.diffBtnTextActive]}>Hard</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>拖曳旋轉 · 捏合縮放 / Drag · Pinch to zoom</Text>
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomText}>🔍 {Math.round(zoomLevel * 100)}%</Text>
        </View>
      </View>

      {/* Vignette overlay when at zoom limits */}
      {zoomLevel < 0.05 && (
        <View style={[styles.vignette, styles.vignetteMin]} pointerEvents="none" />
      )}
      {zoomLevel > 0.95 && (
        <View style={[styles.vignette, styles.vignetteMax]} pointerEvents="none" />
      )}

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

          {/* Mass Upgrade Button */}
          <View style={styles.upgradeRow}>
            <TouchableOpacity
              style={[
                styles.upgradeBtn,
                massLevel >= MAX_UPGRADE_LEVEL && styles.upgradeBtnMaxed,
              ]}
              onPress={() => {
                if (onUpgradePurchase && massLevel < MAX_UPGRADE_LEVEL) {
                  onUpgradePurchase('mass', 100);
                  (window as any).__purchaseUpgrade?.('mass', 100);
                }
              }}
              disabled={massLevel >= MAX_UPGRADE_LEVEL}
            >
              <Text style={styles.upgradeIcon}>📦</Text>
              <View>
                <Text style={styles.upgradeZh}>增加質量</Text>
                <Text style={styles.upgradeEn}>+100 MASS</Text>
              </View>
              {massLevel >= MAX_UPGRADE_LEVEL && (
                <View style={styles.maxBadge}>
                  <Text style={styles.maxBadgeText}>MAX</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.upgradeBtnSpeed,
                speedLevel >= MAX_UPGRADE_LEVEL && styles.upgradeBtnSpeedMaxed,
              ]}
              onPress={() => {
                if (onUpgradePurchase && speedLevel < MAX_UPGRADE_LEVEL) {
                  onUpgradePurchase('speed', 2);
                  (window as any).__purchaseUpgrade?.('speed', 2);
                }
              }}
              disabled={speedLevel >= MAX_UPGRADE_LEVEL}
            >
              <Text style={styles.upgradeIcon}>⚡</Text>
              <View>
                <Text style={styles.upgradeZh}>增加速度</Text>
                <Text style={styles.upgradeEn}>+2x SPEED</Text>
              </View>
              {speedLevel >= MAX_UPGRADE_LEVEL && (
                <View style={styles.maxBadgeSpeed}>
                  <Text style={styles.maxBadgeTextSpeed}>MAX</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
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

      <Modal
        visible={showStatsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatsModal(false)}>
          <View style={styles.highScoreSheet}>
            <Text style={styles.highScoreTitle}>📊 統計 / Statistics</Text>
            <View style={styles.highScoreRow}>
              <Text style={styles.highScoreLabel}>最高分 High Score</Text>
              <Text style={styles.highScoreNum}>{highScore}</Text>
            </View>
            <View style={styles.highScoreRow}>
              <Text style={styles.highScoreLabel}>遊戲次數 Games</Text>
              <Text style={styles.highScoreNum}>{gamesPlayed}</Text>
            </View>
            <TouchableOpacity style={styles.hsCloseBtn} onPress={() => setShowStatsModal(false)}>
              <Text style={styles.hsCloseText}>關閉 / Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.toast}>
        <Text style={styles.toastText}>✅ 解鎖成功！Trail colors unlocked!</Text>
      </View>

      {showHint && hintText && (
        <View style={styles.hintToast}>
          <Text style={styles.hintToastText}>{hintText}</Text>
        </View>
      )}

      {isPaused && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseTitle}>⏸ PAUSED</Text>
          <TouchableOpacity style={styles.resumeBtn} onPress={() => onPause?.()}>
            <Text style={styles.resumeBtnText}>繼續 / Resume</Text>
          </TouchableOpacity>
        </View>
      )}
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
  upgradeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  upgradeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(0,50,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,150,0.3)',
    borderRadius: 12,
  },
  upgradeBtnSpeed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(50,40,0,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,0,0.3)',
    borderRadius: 12,
  },
  upgradeBtnMaxed: {
    backgroundColor: 'rgba(80,60,0,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
  },
  upgradeBtnSpeedMaxed: {
    backgroundColor: 'rgba(60,50,0,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.6)',
  },
  maxBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  maxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffd700',
    letterSpacing: 0.5,
  },
  maxBadgeSpeed: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  maxBadgeTextSpeed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffd700',
    letterSpacing: 0.5,
  },
  upgradeIcon: {
    fontSize: 20,
  },
  upgradeZh: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ddeeff',
  },
  upgradeEn: {
    fontSize: 10,
    color: 'rgba(180,210,255,0.6)',
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
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.18)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 4,
  },
  scoreChipLabel: {
    fontSize: 10,
    color: 'rgba(180,210,255,0.45)',
  },
  scoreValue: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    color: '#5f9',
    fontSize: 13,
    fontWeight: '700',
  },
  highScoreSheet: {
    backgroundColor: '#080820',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.2)',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignSelf: 'center',
  },
  highScoreTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4af',
    marginBottom: 20,
    textAlign: 'center',
  },
  highScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100,180,255,0.1)',
  },
  highScoreLabel: {
    fontSize: 14,
    color: 'rgba(180,210,255,0.7)',
  },
  highScoreNum: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 18,
    fontWeight: '700',
    color: '#5f9',
  },
  hsCloseBtn: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(100,180,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  hsCloseText: {
    fontSize: 13,
    color: 'rgba(180,210,255,0.6)',
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  diffBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(5,5,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.2)',
    borderRadius: 16,
  },
  diffBtnActive: {
    backgroundColor: 'rgba(100,180,255,0.25)',
    borderColor: 'rgba(100,180,255,0.5)',
  },
  diffBtnText: {
    fontSize: 11,
    color: 'rgba(180,210,255,0.5)',
    fontWeight: '500',
  },
  diffBtnTextActive: {
    color: '#4af',
    fontWeight: '700',
  },
  zoomIndicator: {
    marginTop: 8,
    backgroundColor: 'rgba(5,5,30,0.7)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  zoomText: {
    fontSize: 10,
    color: 'rgba(180,210,255,0.6)',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  vignetteMin: {
    backgroundColor: 'rgba(100,50,150,0.15)',
  },
  vignetteMax: {
    backgroundColor: 'rgba(50,100,150,0.15)',
  },
  hintToast: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  hintToastText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(180,210,255,0.7)',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,20,0.8)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,40,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,150,255,0.4)',
    marginLeft: 6,
  },
  pauseBtnText: {
    fontSize: 16,
    color: '#fff',
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,20,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pauseTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 30,
    letterSpacing: 4,
    textShadowColor: 'rgba(100,150,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  resumeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0,150,255,0.3)',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(0,200,255,0.6)',
  },
  resumeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});