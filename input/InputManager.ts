export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private prevKeys: Map<string, boolean> = new Map();

  constructor() {
    this.addEventListeners();
  }
  
  public lateUpdate(): void {
    this.prevKeys = new Map(this.keys);
  }

  private addEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    this.keys.set(event.key.toLowerCase(), true);
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.set(event.key.toLowerCase(), false);
  };

  isKeyDown(key: string): boolean {
    return this.keys.get(key.toLowerCase()) || false;
  }
  
  isKeyPressed(key: string): boolean {
    const isDown = this.isKeyDown(key);
    const wasDown = this.prevKeys.get(key.toLowerCase()) || false;
    return isDown && !wasDown;
  }
  
  isKeyReleased(key: string): boolean {
    const isDown = this.isKeyDown(key);
    const wasDown = this.prevKeys.get(key.toLowerCase()) || false;
    return !isDown && wasDown;
  }
}