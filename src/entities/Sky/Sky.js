import * as THREE from 'three';

import Component from '../Component';

export default class Sky extends Component {
    constructor(scene, skyTexture) {
        super();
        this.scene = scene;
        this.name = 'Sky';
        this.texture = skyTexture;
    }

    Initialize() {
        const hemisphereLight = new THREE.HemisphereLight(
            0xffffff,
            0xfffffff,
            1
        );
        hemisphereLight.color.setHSL(0.6, 1, 0.6);
        hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
        this.scene.add(hemisphereLight);

        const skyGeo = new THREE.SphereGeometry(1000, 25, 25);
        const skyMat = new THREE.MeshBasicMaterial({
            map: this.texture,
            side: THREE.BackSide,
            depthWrite: false,
            toneMapped: false,
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.rotateY(THREE.MathUtils.degToRad(-60));
        this.scene.add(sky);
    }
}
