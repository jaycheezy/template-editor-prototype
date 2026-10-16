/**
 * Prototype data model.
 *
 * `AdElement` mirrors the production canonical layout (flat list of positioned
 * elements with z-order + data binding). `Group`, `Track` and `Clip` mirror the
 * proposed "Extension v1" sidecar from the Animation Timeline spec:
 *  - structural hierarchy (groups/frames with transform inheritance)
 *  - animation tracks (one canonical track per {targetId, property})
 *  - effect clips (IN / DURING / OUT / CUSTOM)
 */

export type ElementType = 'SVG' | 'TEXT' | 'IMAGE' | 'VECTOR';

export type AnimatableProperty =
  | 'x'
  | 'y'
  | 'rotation'
  | 'scaleX'
  | 'scaleY'
  | 'opacity';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface AdElementBase {
  id: string;
  name: string;
  type: ElementType;
  position: Vec3;
  size: Size;
  rotation: number;
  /** Parent group id (extension hierarchy). null = root level. */
  parentId: string | null;
  /** background SVG element is locked & non-groupable, per spec invariant. */
  locked?: boolean;
  /** hidden from canvas + excluded from hit-testing (layout / ADSCM-1380 visibility control). */
  hidden?: boolean;
}

export interface TextElement extends AdElementBase {
  type: 'TEXT';
  /** template string, may contain {TOKENS} */
  content: string;
  color: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  textCase: 'none' | 'upper' | 'lower' | 'title';
  fontFamily: string;
  /** optional boxed background (used by odds chips) */
  boxColor?: string;
  boxRadius?: number;
  letterSpacing?: number;
}

/** Home / away only for now (competitor / opponent focus is out of scope). */
export type TeamSide = 'home' | 'away';
export type TeamAssetKind = 'jersey' | 'badge';
export type ImageSourceKind = 'unset' | 'static' | 'team' | 'custom';
export type CustomFallback = 'jersey' | 'badge' | 'static' | 'none';

/** A normal, non-dynamic image (uploaded file or fixed URL). */
export interface StaticImageSource {
  kind: 'static';
  url: string;
}

/** Sportradar-supplied team asset, resolved from the event's home / away competitor. */
export interface TeamImageSource {
  kind: 'team';
  team: TeamSide;
  asset: TeamAssetKind;
}

/** Operator-hosted image whose URL is built from data-point tokens, e.g. {TEAM_AWAY_COMPETITOR_ID}. */
export interface CustomImageSource {
  kind: 'custom';
  urlTemplate: string;
  /** what to show when the resolved URL can't be loaded */
  fallback: CustomFallback;
  /** team used by the jersey / badge fallback when it can't be inferred from the template tokens */
  fallbackTeam: TeamSide;
  /** used when fallback === 'static' */
  fallbackUrl: string;
}

/** Brand new image element: the user hasn't picked a source yet. */
export interface UnsetImageSource {
  kind: 'unset';
}

export type ImageSource =
  | UnsetImageSource
  | StaticImageSource
  | TeamImageSource
  | CustomImageSource;

/** Last-used settings per mode, so switching modes back and forth never loses input. */
export interface ImageSourceDrafts {
  static?: StaticImageSource;
  team?: TeamImageSource;
  custom?: CustomImageSource;
}

/**
 * One image element, three interchangeable sources. Switching `source.kind`
 * keeps the element id, geometry, z-order and animations intact.
 */
export interface ImageElement extends AdElementBase {
  type: 'IMAGE';
  source: ImageSource;
  sourceDrafts?: ImageSourceDrafts;
}

export interface VectorElement extends AdElementBase {
  type: 'VECTOR';
  svg: string;
  fill: string;
}

export interface SvgElement extends AdElementBase {
  type: 'SVG';
  /** full background frame markup */
  svg: string;
}

export type AdElement = TextElement | ImageElement | VectorElement | SvgElement;

/** Extension hierarchy node. */
export interface GroupTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  /** ordered child ids (element ids and/or group ids) */
  children: string[];
  transform: GroupTransform;
  collapsed?: boolean;
  /** cascades to descendants (Phase 2). */
  hidden?: boolean;
  locked?: boolean;
}

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeOutElastic'
  | 'easeOutBounce';

export interface Keyframe {
  id: string;
  tMs: number;
  value: number;
  easing: EasingFunction;
}

export type ClipKind = 'IN' | 'DURING' | 'OUT' | 'CUSTOM';

export interface Track {
  id: string;
  targetId: string;
  property: AnimatableProperty;
  trackIndex: number;
  keyframes: Keyframe[];
  clipId?: string;
}

export interface Clip {
  id: string;
  targetId: string;
  kind: ClipKind;
  effectId?: string;
  label?: string;
  startTime: number;
  duration: number;
  easing: EasingFunction;
  trackIds: string[];
  isModified?: boolean;
  /** effect parameter (3b): scales distance/scale/angle/amplitude. 1 = default. */
  intensity?: number;
}

export interface AnimationModel {
  durationMs: number;
  fps: number;
  tracks: Record<string, Track>;
  clips: Record<string, Clip>;
}

export interface DataSource {
  id: string;
  name: string;
  market: string;
}
