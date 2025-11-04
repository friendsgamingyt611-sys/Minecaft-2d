
// Perlin noise implementation based on Ken Perlin's original algorithm
export class TerrainNoise {
  private p: number[] = [];
  private permutation: number[];

  constructor(seed: number[]) {
    // Seedable random number generator
    let i = 0;
    const random = () => {
        const t = seed[0] ^ (seed[0] << 11);
        seed[0] = seed[1];
        seed[1] = seed[2];
        seed[2] = seed[3];
        seed[3] = (seed[3] ^ (seed[3] >> 19)) ^ (t ^ (t >> 8));
        return seed[3] / 0x100000000;
    };
    
    this.permutation = Array.from({ length: 256 }, (_, i) => i);
    for (let i = this.permutation.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
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

  public random(): number {
    return this.perlin(Math.random() * 255);
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
