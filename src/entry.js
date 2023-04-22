/**
 * entry.js
 *
 * This is the first file loaded. It sets up the Renderer,
 * Scene, Physics and Entities. It also starts the render loop and
 * handles window resizes.
 *
 */

import * as THREE from 'three';

// * Three utilities
import Stats from 'three/examples/jsm/libs/stats.module';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// * Entity utilities
import EntityManager from './EntityManager';
import Entity from './Entity';

// * Input event handler
import Input from './Input';

// * Entity
import Sky from './entities/Sky/Sky';

// * Assets
import skyTex from './assets/sky.jpg';

import UIManager from './ui/UIManager';

class FPSGameApp {
    constructor() {
        this.lastFrameTime = null;
        this.assets = {};
        this.animFrameId = 0;

        this.Init();
    }

    Init() {
        this.LoadAssets();
        this.SetupGraphics();
        this.SetupStartButton();
    }

    SetupGraphics() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.camera = new THREE.PerspectiveCamera();
        this.camera.near = 0.01;

        // create an AudioListener and add it to the camera

        // renderer
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // handle window resize
        this.WindowResizeHandler();
        window.addEventListener('resize', this.WindowResizeHandler);

        // add element Three into dom
        document.body.appendChild(this.renderer.domElement);

        // Start monitor
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);
    }

    async LoadAssets() {
        const textureLoader = new THREE.TextureLoader();

        const promises = [];

        // Sky
        promises.push(this.AddAsset(skyTex, textureLoader, 'skyTex'));

        await this.PromiseProgress(promises, this.OnProgress);

        this.HideProgress();
        this.ShowMenu();
    }

    EntitySetup() {
        this.entityManager = new EntityManager();

        const skyEntity = new Entity();
        skyEntity.SetName('Sky');
        skyEntity.AddComponent(new Sky(this.scene, this.assets['skyTex']));
        this.entityManager.Add(skyEntity);

        // display amount bullet, blood of player
        const uiManagerEntity = new Entity();
        uiManagerEntity.SetName('UIManager');
        uiManagerEntity.AddComponent(new UIManager());
        this.entityManager.Add(uiManagerEntity);

        // initial entity
        this.entityManager.EndSetup();

        this.scene.add(this.camera);
        this.animFrameId = window.requestAnimationFrame(
            this.OnAnimationFrameHandler
        );
    }

    AddAsset(asset, loader, name) {
        return loader.loadAsync(asset).then((result) => {
            this.assets[name] = result;
        });
    }

    PromiseProgress(proms, progress_cb) {
        let d = 0;
        progress_cb(0);
        for (const p of proms) {
            p.then(() => {
                d++;
                progress_cb((d / proms.length) * 100);
            });
        }
        return Promise.all(proms);
    }

    OnProgress(p) {
        const progressBar = document.getElementById('progress');
        progressBar.style.width = `${p}%`;
    }

    HideProgress() {
        this.OnProgress(0);
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

    StartGame = () => {
        window.cancelAnimationFrame(this.animFrameId);
        Input.ClearEventListeners();

        // Create entities and physics
        this.scene.clear();
        this.EntitySetup();
        this.ShowMenu(false);
    };

    // resize
    WindowResizeHandler = () => {
        const { innerHeight, innerWidth } = window;
        this.renderer.setSize(innerWidth, innerHeight);
        this.camera.aspect = innerWidth / innerHeight;
        this.camera.updateProjectionMatrix();
    };

    // render loop
    OnAnimationFrameHandler = (t) => {
        if (this.lastFrameTime === null) {
            this.lastFrameTime = t;
        }

        const delta = t - this.lastFrameTime;
        let timeElapsed = Math.min(1.0 / 30.0, delta * 0.001);
        this.Step(timeElapsed);
        this.lastFrameTime = t;

        this.animFrameId = window.requestAnimationFrame(
            this.OnAnimationFrameHandler
        );
    };

    Step(elapsedTime) {
        this.entityManager.Update(elapsedTime);

        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new FPSGameApp();
});
