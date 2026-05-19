# blsnkhole / BlackHole Simulator - User Intention

## 1. Project Brief

**Project:** BlackHole Simulator (Expo React Native Game)
**Path:** `/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/game/blackhole-simulator/`
**APK:** `BlackHoleSimulator/BlackHoleSimulator-debug.apk`

控制黑洞吸收物質、變大、避開更大的黑洞。

### Tech Stack
- Expo SDK 54 + React Native 0.81.5
- Three.js 0.184 via expo-gl for 3D rendering
- OrbitControls camera system
- Tail/particle trail effects with custom shaders

### 現有功能
- 黑洞渲染（事件視界效果 + Glow）
- 重力拉動機制（`G = 14`，`BH_MASS = 12000`）
- 碰撞/吸收邏輯
- 質量增長系統
- 物體生成：Planet、Star、Comet
- 尾跡著色自定義（解鎖後）
- 模擬速度控制

## 2. Current Gaps (估計)

- ❌ 沒有遊戲勝負條件（吸收 vs 被吸收）
- ❌ 沒有玩家控制（目前祇是旁觀）
- ❌ 沒有關卡/難度系統
- ❌ 沒有分數系統
- ❌ 沒有音效/背景音樂
- ❌ 沒有存檔/積分保存

## 3. Milestones

- [x] M1: 核心力學（黑洞渲染、重力、吸收、質量增長）
- [ ] M2: 玩家控制 + 簡易玩法
- [ ] M3: 敵對黑洞 + 威脅系統
- [ ] M4: 關卡/難度漸進
- [ ] M5: UI 優化 + 音效 + 分數系統

## 4. Discussions

- 2026-05-19: 發現項目係 `blackhole-simulator` 而非 `blsnkhole`。已創建 user-intention.md 記錄現狀。

## 5. Pending Questions

- 用戶想要純模擬器（旁觀）還是遊戲（玩家控制）？
- 目標平台是 Android APK 還是也需要 iOS？
- 吸收物質的視覺效果是否有特定偏好？