# Guia de Empacotamento e Build Android com Capacitor (`ANDROID_BUILD.md`)

## 1. Configuração do Capacitor

O projeto está configurado em [`capacitor.config.ts`](../capacitor.config.ts):
- **App ID**: `ai.pixelforge.virtualcreatures`
- **App Name**: `PixelForge Virtual Creatures`
- **Web Dir**: `dist`
- **Android SDK (`android/variables.gradle`)**: `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`
- **Capacidades Nativas**:
  - **100% Offline**: Todos os **594 JSONs declarativos** (`11 espécies × 54 quadros`), motores de simulação temporal e persistência local operam no dispositivo sem dependência de internet.
  - **P2P Offline Real**: Plugin nativo `NearbyConnections` em `android/` para pareamento via Bluetooth/Wi-Fi Direct e troca criptográfica de dados na reprodução de dinossauros.
  - **Assinatura Persistente (`release` / `debug`)**: Configurada via `ANDROID_KEYSTORE_*` (em CI/Secrets ou `android/keystore.properties`), mantendo o mesmo `applicationId` entre atualizações OTA e instalações diretas do APK.

---

## 2. Pré-requisitos para Compilação do APK

1. **Node.js 22+** e **pnpm**.
2. **JDK 21** (`JAVA_HOME` configurado).
3. **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT` com Platform API 36 e Build-Tools `36.0.0`).

---

## 3. Comandos de Sincronização e Build do APK

```bash
# 1. Compilar bundle web de produção e sincronizar projeto nativo Android
pnpm android:sync

# 2. Compilar APK de Debug via Gradle Wrapper
pnpm android:build
```
