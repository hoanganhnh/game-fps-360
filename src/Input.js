class Input {
    constructor() {
        this._keyMap = {};
        this.events = [];

        this.AddKeyDownListener(this._onKeyDown);
        this.AddKeyUpListener(this._onKeyUp);
    }

    _addEventListener(element, type, callback) {
        element.addEventListener(type, callback);
        this.events.push({ element, type, callback });
    }

    AddKeyDownListener(callback) {
        this._addEventListener(document, 'keydown', callback);
    }

    AddKeyUpListener(callback) {
        this._addEventListener(document, 'keyup', callback);
    }

    AddMouseMoveListener(callback) {
        this._addEventListener(document, 'mousemove', callback);
    }

    AddClickListener(callback) {
        this._addEventListener(document.body, 'click', callback);
    }

    AddMouseDownListener(callback) {
        this._addEventListener(document.body, 'mousedown', callback);
    }

    AddMouseUpListener(callback) {
        this._addEventListener(document.body, 'mouseup', callback);
    }

    _onKeyDown = (event) => {
        this._keyMap[event.code] = 1;
    };

    _onKeyUp = (event) => {
        this._keyMap[event.code] = 0;
    };

    GetKeyDown(code) {
        return this._keyMap[code] === undefined ? 0 : this._keyMap[code];
    }

    ClearEventListeners() {
        this.events.forEach((e) => {
            e.element.removeEventListener(e.type, e.callback);
        });

        this.events = [];
        this.AddKeyDownListener(this._onKeyDown);
        this.AddKeyUpListener(this._onKeyUp);
    }
}

const inputInstance = new Input();
export default inputInstance;
