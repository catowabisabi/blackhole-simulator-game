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

- [x] 遊戲勝負條件（吸收 vs 被吸收）
- [x] 玩家控制（鍵盤 + 滑動）
- [x] 敵對黑洞威脅系統
- [x] 分數系統
- [x] 關卡/難度漸進系統
- [x] 音效框架（AudioManager）
- [x] AsyncStorage 存檔（最高分、遊戲次數、最高關卡）
- [ ] 實際音效文件（需添加音頻資源）

## 3. Milestones

- [x] M1: 核心力學（黑洞渲染、重力、吸收、質量增長）
- [x] M2: 玩家控制 + 簡易玩法
- [x] M3: 敵對黑洞 + 威脅系統
- [x] M4: 關卡/難度漸進
- [x] M5: UI 優化 + 音效 + 分數系統

## 4. Discussions

- 2026-05-19: 發現項目係 `blackhole-simulator` 而非 `blsnkhole`。已創建 user-intention.md 記錄現狀。

## 5. Pending Questions

- 用戶想要純模擬器（旁觀）還是遊戲（玩家控制）？
- 目標平台是 Android APK 還是也需要 iOS？
- 吸收物質的視覺效果是否有特定偏好？