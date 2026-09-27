'use client';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type CanId = 'crush' | 'zip' | 'twist';

export interface CanModelAssets {
  wrapper: THREE.Group;
  bodyMesh: THREE.Mesh | null;
  topCapMesh: THREE.Mesh | null;
  cap1Mesh: THREE.Mesh | null;
  cap2Mesh: THREE.Mesh | null;
}

const MODEL_PATHS: Record<CanId, string> = {
  crush: '/assets/models/crush_can.glb',
  zip: '/assets/models/zip_can.glb',
  twist: '/assets/models/twist_can.glb',
};

// Global memory cache of parsed raw models
const parsedModelCache = new Map<CanId, CanModelAssets>();
const pendingPromises = new Map<CanId, Promise<CanModelAssets>>();

export function getCachedCanModel(id: CanId): CanModelAssets | null {
  return parsedModelCache.get(id) || null;
}

export function loadOrGetCanModel(id: CanId): Promise<CanModelAssets> {
  const cached = parsedModelCache.get(id);
  if (cached) return Promise.resolve(cached);

  const pending = pendingPromises.get(id);
  if (pending) return pending;

  const promise = new Promise<CanModelAssets>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATHS[id],
      (gltf) => {
        const root = gltf.scene;

        // 1. Calculate raw bounding box
        const rawBox = new THREE.Box3().setFromObject(root);
        const center = new THREE.Vector3();
        rawBox.getCenter(center);
        const size = new THREE.Vector3();
        rawBox.getSize(size);

        // 2. Normalize height to exactly 4.2 units
        const targetHeight = 4.2;
        const scaleFactor = targetHeight / (size.y || 0.706);

        // 3. Center raw model at (0, 0, 0)
        root.position.set(-center.x, -center.y, -center.z);

        let bodyMesh: THREE.Mesh | null = null;
        let topCapMesh: THREE.Mesh | null = null;
        let cap1Mesh: THREE.Mesh | null = null;
        let cap2Mesh: THREE.Mesh | null = null;

        // 4. Extract individual sub-components for deconstructed physics & enhance materials
        root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            if (mesh.name === 'Can_body_Can') {
              bodyMesh = mesh;
              mesh.userData.baseY = mesh.position.y;
            } else if (mesh.name === 'Can_Top_cap') {
              topCapMesh = mesh;
              mesh.userData.baseY = mesh.position.y;
            } else if (mesh.name === 'Can_cap_1') {
              cap1Mesh = mesh;
              mesh.userData.baseY = mesh.position.y;
            } else if (mesh.name === 'Can_cap_2') {
              cap2Mesh = mesh;
              mesh.userData.baseY = mesh.position.y;
              mesh.userData.baseRotX = mesh.rotation.x;
            }

            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.envMapIntensity = 1.4;
                  if (mesh.name.includes('Top_cap') || mesh.name.includes('cap_1') || mesh.name.includes('cap_2')) {
                    // Brushed aluminum metal for lid and pull-tab
                    mat.metalness = 0.88;
                    mat.roughness = 0.22;
                  } else {
                    // Matte soft-touch lacquer for printed cylinder body
                    mat.metalness = 0.26;
                    mat.roughness = 0.16;
                  }
                  mat.needsUpdate = true;
                }
              });
            }
          }
        });

        // 5. Wrap in scaled container
        const wrapper = new THREE.Group();
        wrapper.add(root);
        wrapper.scale.setScalar(scaleFactor);

        const result: CanModelAssets = {
          wrapper,
          bodyMesh,
          topCapMesh,
          cap1Mesh,
          cap2Mesh,
        };

        parsedModelCache.set(id, result);
        pendingPromises.delete(id);
        resolve(result);
      },
      undefined,
      (err) => {
        pendingPromises.delete(id);
        reject(err);
      }
    );
  });

  pendingPromises.set(id, promise);
  return promise;
}

// Prefetch and parse all 3 cans in parallel in background
export function preloadAllVrakCans() {
  if (typeof window === 'undefined') return;
  (['crush', 'zip', 'twist'] as CanId[]).forEach((id) => {
    loadOrGetCanModel(id).catch(() => {});
  });
}
