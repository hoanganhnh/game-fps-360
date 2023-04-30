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
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

// * Entity utilities
import EntityManager from './EntityManager';
import Entity from './Entity';

// * Input event handler
import Input from './Input';

// * Entity
import Sky from './entities/Sky/Sky';
import LevelSetup from './entities/Level/LevelSetup';
import PlayerPhysics from './entities/Player/PlayerPhysics';
import PlayerControls from './entities/Player/PlayerControls';

// * Assets
import skyTex from './assets/sky.jpg';
import level from './assets/level.glb';
import navmesh from './assets/navmesh.obj';
import ak47 from './assets/guns/ak47/ak47.glb';
import muzzleFlash from './assets/muzzle_flash.glb';
// sound
import ak47ShotAudio from './assets/sounds/ak47_shot.wav';
import ak47ReloadAudio from './assets/sounds/reload_gun.wav';

import UIManager from './ui/UIManager';
import { Ammo, AmmoHelper } from './libs/AmmoLib';
import PlayerHealth from './entities/Player/PlayerHealth';
import Weapon from './entities/Weapon/Weapon';

class FPSGameApp {
    constructor() {
        this.lastFrameTime = null;
        this.assets = {};
        this.animFrameId = 0;

        AmmoHelper.Init(() => {
            this.Init();
        });
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
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

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
        const gltfLoader = new GLTFLoader();
        const objLoader = new OBJLoader();
        const audioLoader = new THREE.AudioLoader();

        const promises = [];

        // Sky
        promises.push(this.AddAsset(skyTex, textureLoader, 'skyTex'));
        // Level container environment
        promises.push(this.AddAsset(level, gltfLoader, 'level'));
        promises.push(this.AddAsset(navmesh, objLoader, 'navmesh'));

        // AK47
        promises.push(this.AddAsset(ak47, gltfLoader, 'ak47'));
        promises.push(this.AddAsset(muzzleFlash, gltfLoader, 'muzzleFlash'));
        promises.push(this.AddAsset(ak47ShotAudio, audioLoader, 'ak47Shot'));
        promises.push(
            this.AddAsset(ak47ReloadAudio, audioLoader, 'ak47Reload')
        );

        await this.PromiseProgress(promises, this.OnProgress);

        this.assets['level'] = this.assets['level'].scene;

        this.assets['ak47'].scene.animations = this.assets['ak47'].animations;
        this.assets['muzzleFlash'] = this.assets['muzzleFlash'].scene;

        this.HideProgress();
        this.ShowMenu();
    }

    EntitySetup() {
        this.entityManager = new EntityManager();

        // Sky entity
        const skyEntity = new Entity();
        skyEntity.SetName('Sky');
        skyEntity.AddComponent(new Sky(this.scene, this.assets['skyTex']));
        this.entityManager.Add(skyEntity);

        // Level entity
        const levelEntity = new Entity();
        levelEntity.SetName('Level');
        levelEntity.AddComponent(
            new LevelSetup(this.assets['level'], this.scene, this.physicsWorld)
        );
        this.entityManager.Add(levelEntity);

        // Player entity
        const playerEntity = new Entity();
        playerEntity.SetName('Player');
        playerEntity.AddComponent(new PlayerPhysics(this.physicsWorld));
        playerEntity.AddComponent(new PlayerControls(this.camera));
        playerEntity.AddComponent(new PlayerHealth());
        playerEntity.AddComponent(
            new Weapon(
                this.camera,
                this.assets['ak47'].scene,
                this.assets['muzzleFlash'],
                this.physicsWorld,
                this.assets['ak47Shot'],
                this.assets['ak47Reload'],
                this.listener
            )
        );
        playerEntity.SetPosition(new THREE.Vector3(2.14, 1.48, -1.36));
        playerEntity.SetRotation(
            new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                -Math.PI * 0.5
            )
        );
        this.entityManager.Add(playerEntity);

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

    SetupPhysics() {
        // Physics configuration
        const collisionConfiguration =
            new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(
            collisionConfiguration
        );
        const broadPhase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            dispatcher,
            broadPhase,
            solver,
            collisionConfiguration
        );
        this.physicsWorld.setGravity(new Ammo.btVector3(0.0, -9.81, 0.0));
        const fp = Ammo.addFunction(this.PhysicsUpdate);
        this.physicsWorld.setInternalTickCallback(fp);
        this.physicsWorld
            .getBroadphase()
            .getOverlappingPairCache()
            .setInternalGhostPairCallback(new Ammo.btGhostPairCallback());
    }

    PhysicsUpdate = (world, timeStep) => {
        this.entityManager.PhysicsUpdate(world, timeStep);
    };

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
        this.SetupPhysics();
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
        this.physicsWorld.stepSimulation(elapsedTime, 10);
        this.entityManager.Update(elapsedTime);

        this.renderer.render(this.scene, this.camera);
        this.stats.update();
    }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new FPSGameApp();
});
