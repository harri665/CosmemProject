import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import { GUI } from 'https://cdn.skypack.dev/lil-gui@0.16.1';



const containerEl = document.querySelector(".container");
const canvasEl = document.querySelector("#canvas");

let renderer, scene, mainCamera, mainOrbit, lightHolder;
let instancedMesh, voxelGeometry, voxelMaterial;
let boxHelper, outerShapeMesh;
let dummy, rayCaster, rayCasterIntersects = [];

let voxels = [];

const params = {
    gridSize: .3,
    boxSize: .2,
    boxRoundness: .03,
    randomizer: false,
    showOriginal: false,
    showHelper: false,
    geometry: "torus knot"
}

const geometries = {
    "torus knot": new THREE.TorusKnotGeometry(2, .6, 50, 10),
    "torus": new THREE.TorusGeometry(2, 1, 30, 30),
    "sphere": new THREE.SphereGeometry(2)
}

createMainScene();
// createControls();

window.addEventListener("resize", updateSceneSize);

function createMainScene() {

    // ------------------------------------
    // The scene

    renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        alpha: true,
        antialias: true
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();

    mainCamera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, .01, 1000);
    mainCamera.position.set(0, .5, 4).multiplyScalar(8);

    rayCaster = new THREE.Raycaster();
    dummy = new THREE.Object3D();

    const ambientLight = new THREE.AmbientLight(0xffffff, .5);
    scene.add(ambientLight);

    lightHolder = new THREE.Group();
    const topLight = new THREE.SpotLight(0xffffff, .4);
    topLight.position.set(0, 15, 2);
    topLight.castShadow = true;
    topLight.shadow.camera.near = 10;
    topLight.shadow.camera.far = 30;
    topLight.shadow.mapSize = new THREE.Vector2(2048, 2048);
    lightHolder.add(topLight);
    const sideLight = new THREE.SpotLight(0xffffff, .4);
    sideLight.position.set(0, -4, 5);
    lightHolder.add(sideLight);
    scene.add(lightHolder);

    mainOrbit = new OrbitControls(mainCamera, containerEl);
    mainOrbit.enable = false; 
    
    mainOrbit.enablePan = false;
    mainOrbit.autoRotate = true;
    mainOrbit.enableZoom= false; 
    mainOrbit.minDistance = 13;
    mainOrbit.maxDistance = 13;
    mainOrbit.enableDamping = true;
    mainOrbit.enableRotate = false; 

    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const shadowPlaneMaterial = new THREE.ShadowMaterial({
        opacity: .1
    });
    const shadowPlaneMesh = new THREE.Mesh(planeGeometry, shadowPlaneMaterial);
    shadowPlaneMesh.position.y = -4;
    shadowPlaneMesh.rotation.x = -.5 * Math.PI;
    shadowPlaneMesh.receiveShadow = true;
    lightHolder.add(shadowPlaneMesh);


    // ------------------------------------
    // Mesh to trace

    const outerShapeGeometry = geometries[params.geometry];
    const outerShapeMaterial = new THREE.MeshLambertMaterial({
        color: 0xeeee22,
        side: THREE.DoubleSide,
    });
    outerShapeMesh = new THREE.Mesh(outerShapeGeometry, outerShapeMaterial);
    outerShapeMesh.castShadow = true;
    outerShapeMesh.visible = params.showOriginal;
    scene.add(outerShapeMesh);

    // to visualise the bounding box
    boxHelper = new THREE.BoxHelper(outerShapeMesh, 0x000000);
    boxHelper.visible = params.showHelper;
    scene.add(boxHelper);


    // ------------------------------------
    // Get voxels positions and collect them in voxels array

    voxelizeMesh(outerShapeMesh);

    // ------------------------------------
    // Create instanced mesh and apply the positions to it

    voxelGeometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness);
    voxelMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(0xeeee22)
    });
    instancedMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, voxels.length);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);

    recreateVoxels();


    // ------------------------------------
    // Run the app

    updateSceneSize();
    render();
}


function voxelizeMesh(mesh) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    for (let i = boundingBox.min.x; i < boundingBox.max.x; i += params.gridSize) {
        for (let j = boundingBox.min.y; j < boundingBox.max.y; j += params.gridSize) {
            for (let k = boundingBox.min.z; k < boundingBox.max.z; k += params.gridSize) {
                const pos = new THREE.Vector3(i, j, k);
                if (isInsideMesh(pos, mesh)) {
                    voxels.push({
                        position: pos
                    })
                }
            }
        }
    }
}

function isInsideMesh(pos, mesh) {
    rayCaster.set(pos, {x: 0, y: -1, z: 0});
    rayCasterIntersects = rayCaster.intersectObject(mesh, false);
    return rayCasterIntersects.length % 2 === 1; // we need odd number of intersections
}

function recreateVoxels() {
    for (let i = 0; i < voxels.length; i++) {
        dummy.position.copy(voxels[i].position);
        if (params.randomizer) {
            dummy.position
                .add(
                    new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5)
                        .multiplyScalar(.3)
                )
        }
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
}

function render() {
    mainOrbit.update();
    lightHolder.quaternion.copy(mainCamera.quaternion);
    renderer.render(scene, mainCamera);
    requestAnimationFrame(render);
}

function updateSceneSize() {
    mainCamera.aspect = containerEl.clientWidth / containerEl.clientHeight;
    mainCamera.updateProjectionMatrix();
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
}

function createControls() {
    const gui = new GUI();
    gui.add(params, "showOriginal").onChange(v => {
        outerShapeMesh.visible = v;
        instancedMesh.visible = !v;
    }).name("show original mesh");
    gui.add(params, "showHelper").onChange(v => {
        boxHelper.visible = v;
    }).name("show box helper");
    gui.add(params, "gridSize", .3, .8).step(.1).onChange(() => {
        voxels = [];
        voxelizeMesh(outerShapeMesh);
        scene.remove(instancedMesh);
        instancedMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, voxels.length);
        instancedMesh.geometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        scene.add(instancedMesh);
        recreateVoxels();
    }).name("grid size");
    gui.add(params, "boxSize", .05, params.gridSize).step(.01).onChange(() => {
        instancedMesh.geometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness);
    }).name("voxel size");
    gui.add(params, "boxRoundness", 0, .5 * params.gridSize).step(.01).onChange(() => {
        instancedMesh.geometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness);
    }).name("voxel roundness");
    gui.add(params, "randomizer").onChange(v => {
        recreateVoxels();
    }).name("randomize position");
    gui.add(params, "geometry", Object.keys(geometries)).onChange(v => {
        outerShapeMesh.geometry = geometries[v];

        voxels = [];
        voxelizeMesh(outerShapeMesh);
        scene.remove(instancedMesh);
        instancedMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, voxels.length);
        instancedMesh.geometry = new RoundedBoxGeometry(params.boxSize, params.boxSize, params.boxSize, 2, params.boxRoundness);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        scene.add(instancedMesh);
        recreateVoxels();

        boxHelper.update();
        outerShapeMesh.visible = params.showOriginal;
        instancedMesh.visible = !params.showOriginal;
    });
}


document
.getElementById("showOriginalMesh")
.addEventListener("click", () => {
  params.showOriginal = !params.showOriginal;
  outerShapeMesh.visible = params.showOriginal;
  instancedMesh.visible = !params.showOriginal;
  render(); // Make sure this function re-renders your scene
});

document.getElementById("showBoxHelper").addEventListener("click", () => {
params.showHelper = !params.showHelper;
boxHelper.visible = params.showHelper;
render(); // Make sure this function re-renders your scene
});

document.getElementById("gridSize").addEventListener("input", (event) => {
params.gridSize = parseFloat(event.target.value);
// Re-voxelize and update the scene based on the new grid size
// This might include re-creating your instancedMesh or other scene objects
});

document
.getElementById("voxelSize")
.addEventListener("input", (event) => {
  params.boxSize = parseFloat(event.target.value);
  // Adjust voxel size in your scene
  // This might require updating geometry or material of your instancedMesh
});

// Repeat the pattern for other controls as necessary