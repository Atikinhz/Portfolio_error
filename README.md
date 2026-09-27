# Nikita Zhorov — Portfolio Website

Personal portfolio of **Nikita Zhorov**, Product & Marketing Designer based in Chemnitz, Germany.

## Tech Stack & Architecture

- **Framework:** Next.js 15 (App Router, Standalone output)
- **Library & Language:** React 19, TypeScript
- **Styling:** Tailwind CSS v4, PostCSS
- **Animations:** `motion/react` (Motion v12)
- **3D & WebGL:** Three.js with GLTFLoader, custom shaders & continuous cylinder manifold scroll physics
- **Audio:** Custom Web Audio API sound synthesizer (`lib/sound-fx.ts`)
- **Typography:** Manrope, Anybody, Instrument Serif, JetBrains Mono (Next.js Google Fonts)

## Key Project Structure

```text
├── app/
│   ├── globals.css          # Tailwind CSS v4 directives & font variables
│   ├── layout.tsx           # Root layout with custom elastic cursor & fonts
│   ├── page.tsx             # Main cylinder manifold portfolio scroll experience
│   └── work/
│       ├── vrak/page.tsx    # VRAK 3D beverage branding case study
│       └── morf/page.tsx    # MORF visual identity case study
├── components/
│   ├── vrak-case-view.tsx        # Three.js 3D beverage can stages, GLTF loaders, shaders
│   ├── morf/                     # Morf case study interactive layout components
│   ├── global-elastic-cursor.tsx # Custom reactive cursor
│   ├── disciplines-scene.tsx     # Interactive disciplines showcase
│   ├── typographic-project-scene.tsx # Typography & 3D showcase
│   ├── contact-scene.tsx         # Interactive contact scene
│   └── intro-overlay.tsx         # Preloader & interactive entrance
├── lib/
│   ├── cylinder-manifold.ts # Mathematical cylinder manifold formulas
│   ├── sound-fx.ts          # Interactive Web Audio synthesizer
│   ├── portfolio-data.ts    # Portfolio project & fragment data
│   └── utils.ts             # Tailwind class merging utility
└── public/
    └── assets/              # 3D GLTF models (.glb), case study visuals & textures
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```
