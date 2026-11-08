# Guia de Empacotamento e Build Android com Capacitor (`ANDROID_BUILD.md`)

## 1. Configuração do Capacitor

O projeto está configurado em [`capacitor.config.ts`](file:///home/bob/PixelForge-AI/capacitor.config.ts):
- **App ID**: `ai.pixelforge.virtualcreatures`
- **App Name**: `PixelForge Virtual Creatures`
- **Web Dir**: `dist`
- **Funcionamento Offline**: Todos os 432 JSONs declarativos de pixel art, motores de simulação temporal e persistência local são empacotados no bundle `dist/`, operando 100% offline sem dependência de rede.

---

## 2. Pré-requisitos para Compilação do APK

1. **Node.js 22+** e **pnpm**.
2. **JDK 21** (`JAVA_HOME` configurado).
3. **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT` com Build-Tools e Platform API 35).

---

## 3. Comandos de Sincronização e Build do APK

```bash
# 1. Compilar bundle web de produção e sincronizar projeto nativo Android
pnpm android:sync

# 2. Compilar APK de Debug via Gradle Wrapper (gera android/app/build/outputs/apk/debug/app-debug.apk)
pnpm android:build
```

