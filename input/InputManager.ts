
export class InputManager {
  private keys: Map<string, boolean> = new Map();

  constructor() {
    this.addEventListeners();
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
    if (this.isKeyDown(key)) {
        this.keys.set(key.toLowerCase(), false); // Consume the press
        return true;
    }
    return false;
  }
}
