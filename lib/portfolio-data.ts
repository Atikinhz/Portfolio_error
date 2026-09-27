export interface VisualFragmentItem {
  id: string;
  variant: number;
  aspect: string;
  widthDesktop: string;
  xPercent: number; // percentage from left
  yPercent: number; // percentage from top
  zDepth: number; // spatial depth in px
}

export const VISUAL_FRAGMENTS_DATA: VisualFragmentItem[] = [
  {
    id: 'frag-1',
    variant: 1,
    aspect: 'aspect-[4/5]',
    widthDesktop: 'w-[16vw]',
    xPercent: 6,
    yPercent: 8,
    zDepth: 45,
  },
  {
    id: 'frag-2',
    variant: 2,
    aspect: 'aspect-[16/10]',
    widthDesktop: 'w-[20vw]',
    xPercent: 28,
    yPercent: 6,
    zDepth: 20,
  },
  {
    id: 'frag-3',
    variant: 3,
    aspect: 'aspect-[1/1]',
    widthDesktop: 'w-[15vw]',
    xPercent: 54,
    yPercent: 10,
    zDepth: 55,
  },
  {
    id: 'frag-4',
    variant: 4,
    aspect: 'aspect-[3/4]',
    widthDesktop: 'w-[14vw]',
    xPercent: 71,
    yPercent: 16,
    zDepth: 30,
  },
  {
    id: 'frag-5',
    variant: 5,
    aspect: 'aspect-[16/9]',
    widthDesktop: 'w-[22vw]',
    xPercent: 5,
    yPercent: 52,
    zDepth: 25,
  },
  {
    id: 'frag-6',
    variant: 6,
    aspect: 'aspect-[4/5]',
    widthDesktop: 'w-[15vw]',
    xPercent: 31,
    yPercent: 48,
    zDepth: 65,
  },
  {
    id: 'frag-7',
    variant: 7,
    aspect: 'aspect-[4/3]',
    widthDesktop: 'w-[18vw]',
    xPercent: 50,
    yPercent: 52,
    zDepth: 15,
  },
  {
    id: 'frag-8',
    variant: 8,
    aspect: 'aspect-[5/4]',
    widthDesktop: 'w-[16vw]',
    xPercent: 70,
    yPercent: 55,
    zDepth: 50,
  },
];
