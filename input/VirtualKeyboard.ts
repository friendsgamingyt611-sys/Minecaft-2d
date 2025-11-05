export class VirtualKeyboard {
    private static _instance: VirtualKeyboard;
    private input: HTMLInputElement;
    private onInputCallback: (text: string) => void = () => {};
    private onEnterCallback: () => void = () => {};
    private onBlurCallback: () => void = () => {};

    private constructor() {
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.style.position = 'absolute';
        // Position the input off-screen
        this.input.style.top = '-9999px';
        this.input.style.left = '-9999px';
        this.input.style.opacity = '0';
        this.input.style.pointerEvents = 'none';

        // Set attributes to help mobile browsers
        this.input.setAttribute('autocapitalize', 'off');
        this.input.setAttribute('autocorrect', 'off');
        this.input.setAttribute('spellcheck', 'false');

        document.body.appendChild(this.input);

        this.input.addEventListener('input', this.handleInput);
        this.input.addEventListener('keydown', this.handleKeyDown);
        this.input.addEventListener('blur', this.handleBlur);
    }

    public static get instance(): VirtualKeyboard {
        if (!VirtualKeyboard._instance) {
            VirtualKeyboard._instance = new VirtualKeyboard();
        }
        return VirtualKeyboard._instance;
    }

    public show(options: {
        text: string;
        onInput: (text: string) => void;
        onEnter: () => void;
        onBlur: () => void;
    }) {
        this.input.value = options.text;
        this.onInputCallback = options.onInput;
        this.onEnterCallback = options.onEnter;
        this.onBlurCallback = options.onBlur;
        // A short delay can help ensure the focus event is processed correctly on all devices.
        setTimeout(() => this.input.focus(), 0);
    }

    public hide() {
        this.input.blur();
    }
    
    public setText(text: string) {
        if (this.input.value !== text) {
            this.input.value = text;
        }
    }
    
    public dispose() {
        this.input.removeEventListener('input', this.handleInput);
        this.input.removeEventListener('keydown', this.handleKeyDown);
        this.input.removeEventListener('blur', this.handleBlur);
        if (this.input.parentElement) {
            document.body.removeChild(this.input);
        }
    }

    private handleInput = () => {
        this.onInputCallback(this.input.value);
    };

    private handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            this.onEnterCallback();
        }
    };

    private handleBlur = () => {
        this.onBlurCallback();
        // Clear callbacks to prevent old ones from firing
        this.onInputCallback = () => {};
        this.onEnterCallback = () => {};
        this.onBlurCallback = () => {};
    };
}
