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
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils';

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
import PlayerHealth from './entities/Player/PlayerHealth';
import Weapon from './entities/Weapon/Weapon';
import Navmesh from './entities/Navmesh/Navmesh';
import NpcCharacterController from './entities/NPC/CharacterController';
import AttackTrigger from './entities/NPC/AttackTrigger';
import CharacterCollision from './entities/NPC/CharacterCollision';

// * Assets
import skyTex from './assets/sky.jpg';
import level from './assets/level.glb';
import navmesh from './assets/navmesh.obj';
import ak47 from './assets/ak47/ak47.glb';
import muzzleFlash from './assets/muzzle_flash.glb';
import mutant from './assets/mutant/mutant.fbx';
import idleAnim from './assets/mutant/mutant-breathing-idle.fbx';
import attackAnim from './assets/mutant/mutant-punch.fbx';
import walkAnim from './assets/mutant/mutant-walking.fbx';
import runAnim from './assets/mutant/mutant-run.fbx';
import dieAnim from './assets/mutant/mutant-dying.fbx';
// sound
import ak47ShotAudio from './assets/sounds/ak47_shot.wav';
import ak47ReloadAudio from './assets/sounds/reload_gun.wav';
import backgroundAudio from './assets/sounds/background-sound.wav';

import UIManager from './ui/UIManager';
import { Ammo, AmmoHelper } from './libs/AmmoLib';

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
        const fbxLoader = new FBXLoader();
        const audioLoader = new THREE.AudioLoader();

        const promises = [];

        // Sound background
        promises.push(
            this.AddAsset(backgroundAudio, audioLoader, 'backgroundMusic')
        );

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

        // Mutant
        promises.push(this.AddAsset(mutant, fbxLoader, 'mutant'));
        promises.push(this.AddAsset(idleAnim, fbxLoader, 'idleAnim'));
        promises.push(this.AddAsset(walkAnim, fbxLoader, 'walkAnim'));
        promises.push(this.AddAsset(runAnim, fbxLoader, 'runAnim'));
        promises.push(this.AddAsset(attackAnim, fbxLoader, 'attackAnim'));
        promises.push(this.AddAsset(dieAnim, fbxLoader, 'dieAnim'));

        await this.PromiseProgress(promises, this.OnProgress);

        this.assets['level'] = this.assets['level'].scene;
        this.assets['ak47'].scene.animations = this.assets['ak47'].animations;
        this.assets['muzzleFlash'] = this.assets['muzzleFlash'].scene;

        // Extract mutant animations
        this.mutantAnimations = {};
        this.SetAnimation('idle', this.assets['idleAnim']);
        this.SetAnimation('walk', this.assets['walkAnim']);
        this.SetAnimation('run', this.assets['runAnim']);
        this.SetAnimation('attack', this.assets['attackAnim']);
        this.SetAnimation('die', this.assets['dieAnim']);

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
        // add Navmesh entity into Level
        levelEntity.AddComponent(
            new Navmesh(this.scene, this.assets['navmesh'])
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

        // Mutant entity
        const npcEntity = new Entity();
        npcEntity.SetPosition(new THREE.Vector3(10, 0, 20));
        npcEntity.SetName(`Mutant`);
        npcEntity.AddComponent(
            new NpcCharacterController(
                SkeletonUtils.clone(this.assets['mutant']),
                this.mutantAnimations,
                this.scene,
                this.physicsWorld
            )
        );
        npcEntity.AddComponent(new AttackTrigger(this.physicsWorld));
        npcEntity.AddComponent(new CharacterCollision(this.physicsWorld));
        this.entityManager.Add(npcEntity);

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

    SetAnimation(name, obj) {
        const clip = obj.animations[0];
        this.mutantAnimations[name] = clip;
    }

    SetSoundBackground() {
        this.backgroundSound = new THREE.Audio(this.listener);
        this.backgroundSound.setBuffer(this.assets['backgroundMusic']);
        this.backgroundSound.setLoop(true);
        this.backgroundSound.play();
    }

    SetToggleSoundBackground = () => {
        const volumeOn = document.getElementById('volume_on');
        const mute = document.getElementById('mute');

        const onPlaySound = () => {
            this.backgroundSound.play();
        };

        const onOffSound = () => {
            this.backgroundSound.stop();
        };

        console.log(this.backgroundSound?.isPlaying);
        if (this.backgroundSound.isPlaying) {
            volumeOn.style.visibility = 'hidden';
            mute.style.visibility = 'visible';
            this.backgroundSound.stop();
        } else {
            volumeOn.style.visibility = 'visible';
            mute.style.visibility = 'hidden';
            // volumeOn.setAttribute('visibility', 'visible');
            // mute.setAttribute('visibility', 'hidden');
            this.backgroundSound.play();
        }
    };

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
        this.SetSoundBackground();
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

        document
            .getElementById('sound_container')
            .addEventListener('click', this.SetToggleSoundBackground);
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
