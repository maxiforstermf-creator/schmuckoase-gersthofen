// Nur die Teile von three.js, die js/ring.js braucht (tree-shaken).
// Neu bauen: siehe README → „Vendor-Bibliotheken aktualisieren“.
export {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, MeshPhysicalMaterial,
  MeshBasicMaterial, LatheGeometry, BoxGeometry, PlaneGeometry, Vector2, Mesh, Group, Color,
  Points, BufferGeometry, Float32BufferAttribute, ShaderMaterial, AdditiveBlending, BackSide,
  ACESFilmicToneMapping, SRGBColorSpace, MathUtils
} from 'three';
