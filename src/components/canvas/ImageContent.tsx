import type { CustomImageSource, ImageElement } from '../../types';
import {
  EMPTY_SLOT_SVG,
  inferTeamFromTemplate,
  PLACEHOLDER_IMAGE_SVG,
  resolveTemplate,
  teamAssetSvg,
} from '../../lib/imageSource';
import { useImageProbe } from '../../lib/useImageProbe';

const FILL: React.CSSProperties = { width: '100%', height: '100%' };

function Svg({ markup }: { markup: string }) {
  return <div style={FILL} dangerouslySetInnerHTML={{ __html: markup }} />;
}

function Img({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{ ...FILL, objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
    />
  );
}

function CustomContent({ source }: { source: CustomImageSource }) {
  const { url, unresolved } = resolveTemplate(source.urlTemplate);
  const canLoad = unresolved.length === 0 && /^https?:\/\//.test(url);
  const status = useImageProbe(canLoad ? url : null);

  if (canLoad && status === 'ok') return <Img url={url} />;

  const fallbackTeam = inferTeamFromTemplate(source.urlTemplate) ?? source.fallbackTeam;
  switch (source.fallback) {
    case 'jersey':
    case 'badge':
      return <Svg markup={teamAssetSvg(fallbackTeam, source.fallback)} />;
    case 'static':
      return source.fallbackUrl ? <Img url={source.fallbackUrl} /> : <Svg markup={PLACEHOLDER_IMAGE_SVG} />;
    default:
      return <Svg markup={EMPTY_SLOT_SVG} />;
  }
}

/** Paints an image element according to its current source (static / team asset / custom URL). */
export default function ImageContent({ element }: { element: ImageElement }) {
  const { source } = element;
  switch (source.kind) {
    case 'static':
      return source.url ? <Img url={source.url} /> : <Svg markup={PLACEHOLDER_IMAGE_SVG} />;
    case 'team':
      return <Svg markup={teamAssetSvg(source.team, source.asset)} />;
    case 'custom':
      return <CustomContent source={source} />;
    default:
      return <Svg markup={PLACEHOLDER_IMAGE_SVG} />;
  }
}
