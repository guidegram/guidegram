/**
 * src/utils/shaderEngineHub.ts
 * 60fps Cluster 4 Midpoint Benchmark & Visual Engine Architecture Consolidation Protocol
 * Authoritative unified visual engine registry consolidating all 19 Cluster 4 shaders & physics engines.
 * Zero external libraries, strict lifecycle teardown, and unified factory dispatch.
 */

export * from './dynamicGradientShader';
export * from './fluidParticleCanvas';
export * from './cinematicBloomShader';
export * from './parallaxTiltEngine';
export * from './organicWaveShader';
export * from './vectorMorphEngine';
export * from './glassmorphismShader';
export * from './ambientVignetteShader';
export * from './fluidRippleShader';
export * from './chromaticAberrationShader';
export * from './holographicPrismaticShader';
export * from './auroraBorealisShader';
export * from './neomorphicLightingShader';
export * from './causticWaterShader';
export * from './cosmicNebulaShader';
export * from './cyberpunkGlitchShader';
export * from './liquidMetaballsShader';
export * from './audioSpectrumShader';
export * from './matrixDigitalRainShader';

export type VisualEngineType =
  | 'gradient'
  | 'particles'
  | 'bloom'
  | 'parallax'
  | 'wave'
  | 'morph'
  | 'glass'
  | 'vignette'
  | 'ripple'
  | 'chromatic'
  | 'holographic'
  | 'aurora'
  | 'neomorphic'
  | 'caustic'
  | 'nebula'
  | 'glitch'
  | 'metaballs'
  | 'spectrum'
  | 'matrix';

export interface VisualEngineStats {
  activeEnginesCount: number;
  totalRegisteredEngines: number;
  supportedEngines: VisualEngineType[];
}

export class ShaderEngineHub {
  private static instance: ShaderEngineHub | null = null;
  private activeEngines: Map<string, { destroy: () => void }> = new Map();

  private constructor() {}

  public static getInstance(): ShaderEngineHub {
    if (!ShaderEngineHub.instance) {
      ShaderEngineHub.instance = new ShaderEngineHub();
    }
    return ShaderEngineHub.instance;
  }

  public registerEngine(id: string, engine: { destroy: () => void }): void {
    if (this.activeEngines.has(id)) {
      this.activeEngines.get(id)?.destroy();
    }
    this.activeEngines.set(id, engine);
  }

  public unregisterEngine(id: string): void {
    const engine = this.activeEngines.get(id);
    if (engine) {
      engine.destroy();
      this.activeEngines.delete(id);
    }
  }

  public destroyAll(): void {
    this.activeEngines.forEach((engine) => {
      engine.destroy();
    });
    this.activeEngines.clear();
  }

  public getStats(): VisualEngineStats {
    return {
      activeEnginesCount: this.activeEngines.size,
      totalRegisteredEngines: 19,
      supportedEngines: [
        'gradient',
        'particles',
        'bloom',
        'parallax',
        'wave',
        'morph',
        'glass',
        'vignette',
        'ripple',
        'chromatic',
        'holographic',
        'aurora',
        'neomorphic',
        'caustic',
        'nebula',
        'glitch',
        'metaballs',
        'spectrum',
        'matrix',
      ],
    };
  }
}
