/**
 *
 * @see: https://github.com/kripken/ammo.js
 * @see: https://pybullet.org/wordpress/
 */

import * as _Ammo from 'ammo.js';
import * as THREE from 'three';

/**
 * @see: https://github.com/maurizzzio/quickhull3d/
 */
import { ConvexHull } from '../../node_modules/three/examples/jsm/math/ConvexHull';

let Ammo = null;

function createConvexGeom(object) {
    // Compute the 3D convex hull.
    let hull = new ConvexHull().setFromObject(object);
    let faces = hull.faces;
    let vertices = [];
    let normals = [];

    for (var i = 0; i < faces.length; i++) {
        var face = faces[i];
        var edge = face.edge;
        do {
            var point = edge.head().point;
            vertices.push(point.x, point.y, point.z);
            normals.push(face.normal.x, face.normal.y, face.normal.z);
            edge = edge.next;
        } while (edge !== face.edge);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    return geom;
}

function createConvexHullShape(object) {
    const geometry = createConvexGeom(object);
    let coords = geometry.attributes.position.array;
    let tempVec = new Ammo.btVector3(0, 0, 0);
    let shape = new Ammo.btConvexHullShape();
    for (let i = 0, il = coords.length; i < il; i += 3) {
        tempVec.setValue(coords[i], coords[i + 1], coords[i + 2]);
        let lastOne = i >= il - 3;
        shape.addPoint(tempVec, lastOne);
    }
    return shape;
}

class AmmoHelper {
    static Init(callback = () => {}) {
        _Ammo().then((ammo) => {
            Ammo = ammo;
            callback();
        });
    }
}

export { AmmoHelper, Ammo, createConvexHullShape };
