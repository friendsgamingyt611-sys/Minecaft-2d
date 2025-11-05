

// Perlin noise implementation based on Ken Perlin's original algorithm
export class TerrainNoise {
  private p: number[] = [];
  private permutation: number[];
  private seed: number[];

  constructor(seed: number[]) {
    this.seed = [...seed]; // Store the seed for sfc32

    // Seedable random number generator for permutation shuffling
    let i = 0;
    const sfc32_for_init = () => {
        // A local sfc32 for initialization to not advance the main seed state
        let a = seed[0], b = seed[1], c = seed[2], d = seed[3];
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
        let t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        seed = [b, c, d, t];
        return (t >>> 0) / 4294967296;
    }
    
    this.permutation = Array.from({ length: 256 }, (_, i) => i);
    for (let i = this.permutation.length - 1; i > 0; i--) {
      const j = Math.floor(sfc32_for_init() * (i + 1));
      [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
    }
    this.p = this.permutation.concat(this.permutation);
  }

  public perlin(x: number): number {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = this.fade(x);

    const a = this.p[X] + 0;
    const b = this.p[X + 1] + 0;

    return this.scale(this.lerp(u, this.grad(this.p[a], x), this.grad(this.p[b], x - 1)));
  }

  // A Simple Fast Counter-based PRNG
  private sfc32(): number {
    let a = this.seed[0];
    let b = this.seed[1];
    let c = this.seed[2];
    let d = this.seed[3];
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    this.seed = [b, c, d, t];
    return (t >>> 0) / 4294967296;
  }

  public random(): number {
    return this.sfc32();
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number): number {
    const h = hash & 15;
    const grad = 1 + (h & 7);
    if ((h & 8) !== 0) return -grad * x;
    return grad * x;
  }
  
  private scale(n: number): number {
    return (1 + n) / 2;
  }
}
