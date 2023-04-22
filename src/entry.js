/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene, Physics and Entities. It also starts the render loop and
 * handles window resizes.
 *
 */

class FPSGameApp {
    constructor() {
        this.lastFrameTime = null;
        this.assets = {};
        this.animFrameId = 0;

        this.Init();
    }

    Init() {
        this.LoadAssets();
        this.SetupStartButton();
    }

    SetupStartButton() {
        document
            .getElementById('start_game')
            .addEventListener('click', this.StartGame);
    }

    ShowMenu(visible = true) {
        document.getElementById('menu').style.visibility = visible
            ? 'visible'
            : 'hidden';
    }

    async LoadAssets() {
        this.ShowMenu();
    }

    StartGame = () => {
        window.cancelAnimationFrame(this.animFrameId);
        this.ShowMenu(false);
    };
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new FPSGameApp();
});
