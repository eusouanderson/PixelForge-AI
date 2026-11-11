import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { PointLight } from '@babylonjs/core/Lights/pointLight.js';
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
import type {
  DeclarativePixelArt,
  UpscaleRenderOptions
} from '@/core/domain/pixel-art/interfaces';
import { APP_CONFIG } from '@/shared/constants/app-config';
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
  rasterizeBackdropToRgbaBytes,
  rasterizeParticlePatternToRgbaBytes,
  rasterizePedestalToRgbaBytes,
  rasterizeSpriteToRgbaBytes,
  sharedBabylonSpriteRenderer
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
  private backdropPlane: Mesh | null = null;
  private backdropMaterial: StandardMaterial | null = null;
  private backdropTexture: RawTexture | null = null;
  private pedestalTexture: RawTexture | null = null;
  private accentPointLight: PointLight | null = null;
  private basePointLightIntensity: number = 0;
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

    // Localized accent point light if configured
    if (lighting.pointLightColorHex) {
      const pLight = new PointLight(
        'accentPointLight',
        new Vector3(
          lighting.pointLightPosition?.x ?? 0,
          lighting.pointLightPosition?.y ?? 0.5,
          lighting.pointLightPosition?.z ?? -0.5
        ),
        this.scene
      );
      pLight.diffuse = hexToColor3(lighting.pointLightColorHex);
      pLight.intensity = lighting.pointLightIntensity ?? 0.6;
      pLight.range = lighting.pointLightRange ?? 6.0;
      this.accentPointLight = pLight;
      this.basePointLightIntensity = pLight.intensity;
    }

    // Distant 2.5D Pixel Art Backdrop Plane
    if (environmentConfig.backdrop) {
      const backdropBytes = rasterizeBackdropToRgbaBytes(environmentConfig.backdrop, 128, 64);
      this.backdropTexture = RawTexture.CreateRGBATexture(
        backdropBytes.data,
        backdropBytes.width,
        backdropBytes.height,
        this.scene,
        false,
        false,
        Texture.NEAREST_SAMPLINGMODE
      );

      const backdropPlane = MeshBuilder.CreatePlane(
        'environmentBackdropPlane',
        { width: 10.5, height: 7.2 },
        this.scene
      );
      backdropPlane.position = new Vector3(0, 0.6, 3.8);

      const backdropMat = new StandardMaterial('environmentBackdropMat', this.scene);
      backdropMat.specularColor = Color3.Black();
      backdropMat.emissiveColor = Color3.White();
      backdropMat.disableLighting = true;
      backdropMat.diffuseTexture = this.backdropTexture;
      backdropMat.emissiveTexture = this.backdropTexture;
      backdropPlane.material = backdropMat;

      this.backdropPlane = backdropPlane;
      this.backdropMaterial = backdropMat;
      this.environmentMeshes.push(backdropPlane);
    }

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

    // Elemental Pedestal with carved runic texture
    const pedestal = MeshBuilder.CreateCylinder(
      'creaturePedestal',
      { diameterTop: 2.1, diameterBottom: 2.5, height: 0.32, tessellation: 24 },
      this.scene
    );
    pedestal.position = new Vector3(0, -0.82, 0);
    const pedMat = new StandardMaterial('pedestalMat', this.scene);
    const pedBytes = rasterizePedestalToRgbaBytes(
      environmentConfig.pedestalColorHex,
      environmentConfig.pedestalAccentHex,
      environmentConfig.element,
      64
    );
    this.pedestalTexture = RawTexture.CreateRGBATexture(
      pedBytes.data,
      pedBytes.width,
      pedBytes.height,
      this.scene,
      false,
      false,
      Texture.NEAREST_SAMPLINGMODE
    );
    pedMat.diffuseTexture = this.pedestalTexture;
    pedMat.emissiveTexture = this.pedestalTexture;
    pedMat.emissiveColor = hexToColor3(environmentConfig.pedestalAccentHex).scale(0.35);
    pedMat.specularColor = Color3.Black();
    pedestal.material = pedMat;
    this.environmentMeshes.push(pedestal);

    // Elemental Props (Midground and Foreground)
    for (const prop of environmentConfig.props) {
      let mesh: Mesh;
      if (prop.shape === 'crystal-pillar') {
        mesh = MeshBuilder.CreateCylinder(
          prop.id,
          {
            height: prop.scale.y,
            diameterTop: prop.scale.x * 0.45,
            diameterBottom: prop.scale.x,
            tessellation: 6
          },
          this.scene
        );
      } else if (prop.shape === 'floating-ring') {
        mesh = MeshBuilder.CreateTorus(
          prop.id,
          {
            diameter: prop.scale.x,
            thickness: Math.max(0.08, prop.scale.z * 0.4),
            tessellation: 16
          },
          this.scene
        );
        mesh.rotation.x = Math.PI / 3;
      } else if (prop.shape === 'lava-pool') {
        mesh = MeshBuilder.CreateCylinder(
          prop.id,
          {
            height: prop.scale.y,
            diameter: prop.scale.x,
            tessellation: 16
          },
          this.scene
        );
      } else if (prop.shape === 'mushroom') {
        mesh = MeshBuilder.CreateCylinder(
          prop.id,
          {
            height: prop.scale.y,
            diameterTop: prop.scale.x * 0.6,
            diameterBottom: prop.scale.x * 0.9,
            tessellation: 10
          },
          this.scene
        );
      } else if (prop.shape === 'solar-obelisk') {
        mesh = MeshBuilder.CreateCylinder(
          prop.id,
          {
            height: prop.scale.y,
            diameterTop: prop.scale.x * 0.35,
            diameterBottom: prop.scale.x,
            tessellation: 4
          },
          this.scene
        );
      } else {
        mesh = MeshBuilder.CreateBox(
          prop.id,
          {
            width: prop.scale.x,
            height: prop.scale.y,
            depth: prop.scale.z
          },
          this.scene
        );
      }

      mesh.position = new Vector3(prop.position.x, prop.position.y, prop.position.z);
      mesh.metadata = {
        baseY: prop.position.y,
        floatAmplitude: prop.floatAmplitude,
        rotationSpeed: prop.rotationSpeed,
        depthLayer: prop.depthLayer
      };
      const propMat = new StandardMaterial(`${prop.id}_mat`, this.scene);
      propMat.diffuseColor = hexToColor3(prop.primaryColorHex);
      propMat.emissiveColor = hexToColor3(prop.emissiveColorHex).scale(0.5);
      propMat.specularColor = Color3.Black();
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

  public updateCreatureSprite(
    sprite: DeclarativePixelArt,
    showGrid: boolean = false,
    upscaleOptions: UpscaleRenderOptions = {}
  ): void {
    if (!this.scene || !this.creatureMaterial) return;

    const rgba = rasterizeSpriteToRgbaBytes(
      sprite,
      upscaleOptions.scale ?? APP_CONFIG.rendering.surfaceScales.texture3d,
      showGrid,
      upscaleOptions
    );

    const currentSize = this.creatureTexture?.getSize();
    if (
      this.creatureTexture &&
      currentSize &&
      currentSize.width === rgba.width &&
      currentSize.height === rgba.height
    ) {
      this.creatureTexture.update(rgba.data);
      return;
    }

    if (this.creatureTexture) {
      this.creatureTexture.dispose();
    }

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
    if (this.backdropPlane) {
      this.backdropPlane.position.x = Math.sin(this.tickAngle * 0.4) * 0.05;
    }
    if (this.accentPointLight) {
      this.accentPointLight.intensity =
        this.basePointLightIntensity + Math.sin(this.tickAngle * 1.5) * 0.08;
    }
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
    if (this.backdropTexture) {
      this.backdropTexture.dispose();
      this.backdropTexture = null;
    }
    if (this.backdropMaterial) {
      this.backdropMaterial.dispose();
      this.backdropMaterial = null;
    }
    this.backdropPlane = null;
    if (this.pedestalTexture) {
      this.pedestalTexture.dispose();
      this.pedestalTexture = null;
    }
    if (this.accentPointLight) {
      this.accentPointLight.dispose();
      this.accentPointLight = null;
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
    sharedBabylonSpriteRenderer.clearCaches();
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
      activeTextures:
        (this.creatureTexture ? 1 : 0) +
        (this.particleTexture ? 1 : 0) +
        (this.backdropTexture ? 1 : 0) +
        (this.pedestalTexture ? 1 : 0),
      isDisposed: this.isDisposedState
    };
  }
}

