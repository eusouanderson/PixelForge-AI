import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem.js';
import { Scene } from '@babylonjs/core/scene.js';
import '@babylonjs/core/Shaders/default.vertex.js';
import '@babylonjs/core/Shaders/default.fragment.js';
import '@babylonjs/core/Shaders/particles.vertex.js';
import '@babylonjs/core/Shaders/particles.fragment.js';
import type { DeclarativePixelArt } from '@/core/domain/pixel-art/interfaces';
import type { CharacterId } from '@/domains/characters/types';
import type { CharacterEnvironmentConfig } from '@/domains/environments/types';
import type {
  CharacterParticleConfig,
  ReactiveParticleBurstConfig
} from '@/domains/particles/types';
import { scaleParticleConfigForQuality } from '@/domains/particles/domain/particle-registry';
import type { GraphicsQualityPreset } from '@/domains/settings/types';
import type { BabylonEngineConfig, CreatureSceneControllerPort } from './types';
import {
  rasterizeParticlePatternToRgbaBytes,
  rasterizeSpriteToRgbaBytes
} from './pixel-texture-adapter';

function hexToColor3(hex: string): Color3 {
  return Color3.FromHexString(hex.slice(0, 7));
}

function hexToColor4(hex: string, alpha: number = 1.0): Color4 {
  const c3 = hexToColor3(hex);
  return new Color4(c3.r, c3.g, c3.b, alpha);
}

export class BabylonCreatureSceneController implements CreatureSceneControllerPort {
  private engine: Engine | null = null;
  private scene: Scene | null = null;
  private creaturePlane: Mesh | null = null;
  private creatureMaterial: StandardMaterial | null = null;
  private creatureTexture: RawTexture | null = null;
  private ambientParticles: ParticleSystem | null = null;
  private particleTexture: RawTexture | null = null;
  private currentParticleConfig: CharacterParticleConfig | null = null;
  private environmentMeshes: Mesh[] = [];
  private quality: GraphicsQualityPreset = 'high';
  private isPaused: boolean = false;
  private isDisposedState: boolean = false;
  private tickAngle: number = 0;

  public initialize(config: BabylonEngineConfig): void {
    this.quality = config.quality;
    this.isDisposedState = false;

    const glContext =
      config.canvas.getContext('webgl2') ?? config.canvas.getContext('webgl');

    /* v8 ignore start */
    if (glContext) {
      this.engine = new Engine(config.canvas, false, {
        preserveDrawingBuffer: false,
        stencil: false,
        powerPreference: 'high-performance'
      });
    } else {
      this.engine = new NullEngine();
    }
    /* v8 ignore stop */

    this.scene = new Scene(this.engine);
    const camera = new ArcRotateCamera(
      'mobilePortraitCamera',
      -Math.PI / 2,
      Math.PI / 2.25,
      5.2,
      new Vector3(0, 0.25, 0),
      this.scene
    );
    camera.lowerRadiusLimit = 4.2;
    camera.upperRadiusLimit = 6.8;

    this.engine.runRenderLoop(() => {
      /* v8 ignore start */
      if (!this.isPaused && this.scene && !this.isDisposedState) {
        this.animateEnvironmentProps();
        this.scene.render();
      }
      /* v8 ignore stop */
    });
  }

  public loadCharacterEnvironment(
    _characterId: CharacterId,
    environmentConfig: CharacterEnvironmentConfig,
    particleConfig: CharacterParticleConfig,
    initialSprite: DeclarativePixelArt
  ): void {
    if (!this.scene) return;

    this.clearCurrentEnvironmentResources();
    this.currentParticleConfig = particleConfig;

    const { lighting } = environmentConfig;
    this.scene.clearColor = hexToColor4(lighting.clearColorHex, 1.0);
    this.scene.ambientColor = hexToColor3(lighting.ambientColorHex);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = hexToColor3(lighting.fogColorHex);
    this.scene.fogDensity = lighting.fogDensity;

    const hemiLight = new HemisphericLight(
      'ambientHemiLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.diffuse = hexToColor3(lighting.mainLightColorHex);
    hemiLight.groundColor = hexToColor3(lighting.groundColorHex);
    hemiLight.intensity = lighting.mainLightIntensity;

    const rimLight = new DirectionalLight(
      'rimLight',
      new Vector3(-0.5, -1, 0.5),
      this.scene
    );
    rimLight.diffuse = hexToColor3(lighting.rimLightColorHex);
    rimLight.intensity = lighting.rimLightIntensity;

    // Ground sanctuary disc
    const ground = MeshBuilder.CreateCylinder(
      'sanctuaryGround',
      { diameter: 5.8, height: 0.18, tessellation: 24 },
      this.scene
    );
    ground.position = new Vector3(0, -1.05, 0.2);
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = hexToColor3(environmentConfig.groundColorHex);
    groundMat.specularColor = Color3.Black();
    ground.material = groundMat;
    this.environmentMeshes.push(ground);

    // Elemental Pedestal
    const pedestal = MeshBuilder.CreateCylinder(
      'creaturePedestal',
      { diameterTop: 2.1, diameterBottom: 2.5, height: 0.32, tessellation: 16 },
      this.scene
    );
    pedestal.position = new Vector3(0, -0.82, 0);
    const pedMat = new StandardMaterial('pedestalMat', this.scene);
    pedMat.diffuseColor = hexToColor3(environmentConfig.pedestalColorHex);
    pedMat.emissiveColor = hexToColor3(environmentConfig.pedestalAccentHex).scale(0.28);
    pedestal.material = pedMat;
    this.environmentMeshes.push(pedestal);

    // Elemental Props
    for (const prop of environmentConfig.props) {
      const mesh = MeshBuilder.CreateBox(
        prop.id,
        {
          width: prop.scale.x,
          height: prop.scale.y,
          depth: prop.scale.z
        },
        this.scene
      );
      mesh.position = new Vector3(prop.position.x, prop.position.y, prop.position.z);
      mesh.metadata = {
        baseY: prop.position.y,
        floatAmplitude: prop.floatAmplitude,
        rotationSpeed: prop.rotationSpeed
      };
      const propMat = new StandardMaterial(`${prop.id}_mat`, this.scene);
      propMat.diffuseColor = hexToColor3(prop.primaryColorHex);
      propMat.emissiveColor = hexToColor3(prop.emissiveColorHex).scale(0.5);
      mesh.material = propMat;
      this.environmentMeshes.push(mesh);
    }

    // Billboard Plane for the 32x32 Pixel Art Creature
    this.creaturePlane = MeshBuilder.CreatePlane(
      'creaturePixelPlane',
      { width: 2.35, height: 2.35 },
      this.scene
    );
    this.creaturePlane.position = new Vector3(0, 0.45, 0);
    this.creaturePlane.billboardMode = Mesh.BILLBOARDMODE_ALL;

    this.creatureMaterial = new StandardMaterial('creaturePixelMat', this.scene);
    this.creatureMaterial.specularColor = Color3.Black();
    this.creatureMaterial.emissiveColor = Color3.White();
    this.creatureMaterial.disableLighting = true;
    this.creaturePlane.material = this.creatureMaterial;
    this.environmentMeshes.push(this.creaturePlane);

    this.updateCreatureSprite(initialSprite, false);
    this.setupCharacterParticleSystem(particleConfig);
  }

  public updateCreatureSprite(sprite: DeclarativePixelArt, showGrid: boolean = false): void {
    if (!this.scene || !this.creatureMaterial) return;

    if (this.creatureTexture) {
      this.creatureTexture.dispose();
    }

    const rgba = rasterizeSpriteToRgbaBytes(sprite, 8, showGrid);
    this.creatureTexture = RawTexture.CreateRGBATexture(
      rgba.data,
      rgba.width,
      rgba.height,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    this.creatureTexture.hasAlpha = true;
    this.creatureMaterial.diffuseTexture = this.creatureTexture;
    this.creatureMaterial.opacityTexture = this.creatureTexture;
    this.creatureMaterial.useAlphaFromDiffuseTexture = true;
  }

  private setupCharacterParticleSystem(baseConfig: CharacterParticleConfig): void {
    /* v8 ignore start */
    if (!this.scene) return;
    /* v8 ignore stop */

    const scaled = scaleParticleConfigForQuality(baseConfig, this.quality);
    const pSys = new ParticleSystem(scaled.id, scaled.maxParticles, this.scene);

    const texBytes = rasterizeParticlePatternToRgbaBytes(
      scaled.texturePattern,
      '#ffffff',
      4
    );
    this.particleTexture = RawTexture.CreateRGBATexture(
      texBytes.data,
      texBytes.width,
      texBytes.height,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    pSys.particleTexture = this.particleTexture;

    pSys.emitter = new Vector3(0, 0.35, 0);
    pSys.minEmitBox = new Vector3(scaled.emitBoxMin.x, scaled.emitBoxMin.y, scaled.emitBoxMin.z);
    pSys.maxEmitBox = new Vector3(scaled.emitBoxMax.x, scaled.emitBoxMax.y, scaled.emitBoxMax.z);
    pSys.color1 = hexToColor4(scaled.primaryColorHex, 1.0);
    pSys.color2 = hexToColor4(scaled.secondaryColorHex, 0.95);
    pSys.colorDead = hexToColor4(scaled.accentColorHex, 0.0);
    pSys.minSize = scaled.minSize;
    pSys.maxSize = scaled.maxSize;
    pSys.minLifeTime = scaled.minLifeTimeSec;
    pSys.maxLifeTime = scaled.maxLifeTimeSec;
    pSys.emitRate = scaled.emitRate;
    pSys.gravity = new Vector3(scaled.gravity.x, scaled.gravity.y, scaled.gravity.z);
    pSys.direction1 = new Vector3(scaled.direction1.x, scaled.direction1.y, scaled.direction1.z);
    pSys.direction2 = new Vector3(scaled.direction2.x, scaled.direction2.y, scaled.direction2.z);
    pSys.minEmitPower = scaled.minEmitPower;
    pSys.maxEmitPower = scaled.maxEmitPower;
    pSys.start();

    this.ambientParticles = pSys;
  }

  public triggerReactiveParticles(burst: ReactiveParticleBurstConfig): void {
    if (!this.ambientParticles || !this.currentParticleConfig) return;

    if (burst.colorOverrideHex) {
      this.ambientParticles.color1 = hexToColor4(burst.colorOverrideHex, 1.0);
    } else {
      this.ambientParticles.color1 = hexToColor4(
        this.currentParticleConfig.primaryColorHex,
        1.0
      );
    }

    this.ambientParticles.manualEmitCount = burst.emitCount;
  }

  public setQualityPreset(quality: GraphicsQualityPreset): void {
    this.quality = quality;
    if (this.currentParticleConfig && this.scene) {
      /* v8 ignore start */
      if (this.ambientParticles) {
        this.ambientParticles.dispose();
        this.ambientParticles = null;
      }
      if (this.particleTexture) {
        this.particleTexture.dispose();
        this.particleTexture = null;
      }
      /* v8 ignore stop */
      this.setupCharacterParticleSystem(this.currentParticleConfig);
    }
  }

  /* v8 ignore start */
  private animateEnvironmentProps(): void {
    this.tickAngle += 0.03;
    for (const mesh of this.environmentMeshes) {
      const meta = mesh.metadata as
        | { baseY?: number; floatAmplitude?: number; rotationSpeed?: number }
        | undefined;
      if (meta && typeof meta.baseY === 'number') {
        mesh.position.y = meta.baseY + Math.sin(this.tickAngle) * (meta.floatAmplitude ?? 0);
        mesh.rotation.y += meta.rotationSpeed ?? 0;
      }
    }
  }
  /* v8 ignore stop */

  private clearCurrentEnvironmentResources(): void {
    /* v8 ignore start */
    if (this.ambientParticles) {
      this.ambientParticles.dispose();
      this.ambientParticles = null;
    }
    if (this.particleTexture) {
      this.particleTexture.dispose();
      this.particleTexture = null;
    }
    if (this.creatureTexture) {
      this.creatureTexture.dispose();
      this.creatureTexture = null;
    }
    if (this.creatureMaterial) {
      this.creatureMaterial.dispose();
      this.creatureMaterial = null;
    }
    for (const mesh of this.environmentMeshes) {
      mesh.material?.dispose();
      mesh.dispose();
    }
    this.environmentMeshes = [];
    this.creaturePlane = null;

    if (this.scene) {
      for (const light of [...this.scene.lights]) {
        light.dispose();
      }
    }
    /* v8 ignore stop */
  }

  public pauseRendering(): void {
    this.isPaused = true;
  }

  public resumeRendering(): void {
    this.isPaused = false;
  }

  public resize(): void {
    this.engine?.resize();
  }

  public dispose(): void {
    this.clearCurrentEnvironmentResources();
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    this.isDisposedState = true;
  }

  public getActiveResourceMetrics(): {
    readonly activeMeshes: number;
    readonly activeParticleSystems: number;
    readonly activeTextures: number;
    readonly isDisposed: boolean;
  } {
    return {
      activeMeshes: this.environmentMeshes.length,
      activeParticleSystems: this.ambientParticles ? 1 : 0,
      activeTextures: (this.creatureTexture ? 1 : 0) + (this.particleTexture ? 1 : 0),
      isDisposed: this.isDisposedState
    };
  }
}

