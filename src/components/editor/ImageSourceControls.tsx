import { useRef } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormLabel,
  HStack,
  Icon,
  Input,
  Select,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { LuCircleCheck, LuCircleAlert, LuImage, LuLink, LuShirt, LuUpload, LuX } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import type {
  CustomFallback,
  CustomImageSource,
  ImageElement,
  ImageSourceKind,
  StaticImageSource,
  TeamAssetKind,
  TeamImageSource,
  TeamSide,
} from '../../types';
import {
  inferTeamFromTemplate,
  resolveTemplate,
  SOURCE_LABELS,
  teamAssetSvg,
} from '../../lib/imageSource';
import { useImageProbe } from '../../lib/useImageProbe';
import TokenInput from './TokenInput';

type ChosenKind = Exclude<ImageSourceKind, 'unset'>;

const KIND_META: Record<ChosenKind, { icon: IconType; blurb: string }> = {
  static: { icon: LuImage, blurb: 'Upload a file or link to one fixed image.' },
  team: { icon: LuShirt, blurb: 'Sportradar jersey or badge for the home or away team.' },
  custom: { icon: LuLink, blurb: 'Your own image, loaded by team ID from a URL template.' },
};

const KINDS: ChosenKind[] = ['static', 'team', 'custom'];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel fontSize="13px" fontWeight={600} color="gray.700" mb={1}>
      {children}
    </FormLabel>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  isDisabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  isDisabled?: boolean;
}) {
  return (
    <ButtonGroup isAttached size="sm" variant="outline" isDisabled={isDisabled}>
      {options.map((o) => (
        <Button
          key={o.value}
          onClick={() => onChange(o.value)}
          bg={value === o.value ? 'mcBlue.50' : 'white'}
          borderColor={value === o.value ? 'mcBlue.300' : 'gray.200'}
          color={value === o.value ? 'mcBlue.600' : 'gray.600'}
          fontWeight={600}
        >
          {o.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function SourceCards({
  onPick,
  isDisabled,
  teamDisabledReason,
}: {
  onPick: (kind: ChosenKind) => void;
  isDisabled: boolean;
  teamDisabledReason: string | null;
}) {
  return (
    <VStack align="stretch" spacing={2}>
      {KINDS.map((kind) => {
        const meta = KIND_META[kind];
        const blocked = isDisabled || (kind === 'team' && teamDisabledReason != null);
        return (
          <Tooltip key={kind} label={kind === 'team' ? teamDisabledReason : undefined} isDisabled={!teamDisabledReason || kind !== 'team'}>
            <Flex
              as="button"
              type="button"
              disabled={blocked}
              onClick={() => onPick(kind)}
              align="center"
              gap={3}
              textAlign="left"
              p={3}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="8px"
              bg="white"
              opacity={blocked ? 0.5 : 1}
              cursor={blocked ? 'not-allowed' : 'pointer'}
              _hover={blocked ? undefined : { borderColor: 'mcBlue.300', bg: 'mcBlue.50' }}
            >
              <Flex boxSize="32px" borderRadius="6px" bg="mcBlue.50" color="mcBlue.600" align="center" justify="center" flexShrink={0}>
                <Icon as={meta.icon} boxSize={4} />
              </Flex>
              <Box>
                <Text fontSize="14px" fontWeight={700} color="gray.800">
                  {SOURCE_LABELS[kind]}
                </Text>
                <Text fontSize="12px" color="gray.500">
                  {meta.blurb}
                </Text>
              </Box>
            </Flex>
          </Tooltip>
        );
      })}
    </VStack>
  );
}

function StaticControls({ el, source, isDisabled }: { el: ImageElement; source: StaticImageSource; isDisabled: boolean }) {
  const update = useEditorStore((s) => s.updateImageSource);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update(el.id, { url: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const isData = source.url.startsWith('data:');

  return (
    <VStack align="stretch" spacing={3}>
      <Box>
        <FieldLabel>Image URL</FieldLabel>
        <Input
          size="sm"
          borderRadius="6px"
          placeholder="https://…"
          isDisabled={isDisabled}
          value={isData ? '' : source.url}
          onChange={(e) => update(el.id, { url: e.target.value })}
        />
      </Box>
      <HStack spacing={2}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            onFile(e.target.files ? e.target.files[0] : undefined);
            e.target.value = '';
          }}
        />
        <Button size="sm" variant="outline" leftIcon={<Icon as={LuUpload} />} isDisabled={isDisabled} onClick={() => fileRef.current?.click()}>
          Upload image
        </Button>
        {source.url && (
          <Button size="sm" variant="ghost" leftIcon={<Icon as={LuX} />} isDisabled={isDisabled} onClick={() => update(el.id, { url: '' })}>
            Clear
          </Button>
        )}
      </HStack>
      <Text fontSize="12px" color="gray.500">
        {isData ? 'Using an uploaded image. ' : ''}The same image is shown in every ad. For per-team images use Team asset or Custom URL.
      </Text>
    </VStack>
  );
}

function TeamControls({ el, source, isDisabled }: { el: ImageElement; source: TeamImageSource; isDisabled: boolean }) {
  const update = useEditorStore((s) => s.updateImageSource);
  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <FieldLabel>Team</FieldLabel>
        <Segmented<TeamSide>
          value={source.team}
          isDisabled={isDisabled}
          onChange={(team) => update(el.id, { team })}
          options={[
            { value: 'home', label: 'Home' },
            { value: 'away', label: 'Away' },
          ]}
        />
      </Box>
      <Box>
        <FieldLabel>Asset type</FieldLabel>
        <Segmented<TeamAssetKind>
          value={source.asset}
          isDisabled={isDisabled}
          onChange={(asset) => update(el.id, { asset })}
          options={[
            { value: 'jersey', label: 'Jersey' },
            { value: 'badge', label: 'Badge' },
          ]}
        />
      </Box>
      <Text fontSize="12px" color="gray.500" fontStyle="italic">
        Supplied by Sportradar from the event&apos;s {source.team} team. When badges or jerseys are used,
        international events (USA vs UK) display country flags. This setting applies to this element only.
      </Text>
    </VStack>
  );
}

function ProbeStatusRow({ url, canLoad }: { url: string; canLoad: boolean }) {
  const status = useImageProbe(canLoad ? url : null);
  if (!canLoad) {
    return (
      <HStack spacing={1.5} color="orange.600">
        <Icon as={LuCircleAlert} boxSize={3.5} />
        <Text fontSize="12px">URL can&apos;t be resolved yet. The fallback is shown.</Text>
      </HStack>
    );
  }
  if (status === 'loading') {
    return (
      <HStack spacing={1.5} color="gray.500">
        <Spinner size="xs" />
        <Text fontSize="12px">Checking the preview match&apos;s image…</Text>
      </HStack>
    );
  }
  if (status === 'ok') {
    return (
      <HStack spacing={1.5} color="green.600">
        <Icon as={LuCircleCheck} boxSize={3.5} />
        <Text fontSize="12px">Image found for the preview match.</Text>
      </HStack>
    );
  }
  return (
    <HStack spacing={1.5} color="orange.600">
      <Icon as={LuCircleAlert} boxSize={3.5} />
      <Text fontSize="12px">No image at this URL for the preview match. The fallback is shown.</Text>
    </HStack>
  );
}

function CustomControls({ el, source, isDisabled }: { el: ImageElement; source: CustomImageSource; isDisabled: boolean }) {
  const update = useEditorStore((s) => s.updateImageSource);
  const { url, unresolved } = resolveTemplate(source.urlTemplate);
  const canLoad = unresolved.length === 0 && /^https?:\/\//.test(url);
  const inferred = inferTeamFromTemplate(source.urlTemplate);
  const usesTeamFallback = source.fallback === 'jersey' || source.fallback === 'badge';

  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <FieldLabel>Content template</FieldLabel>
        <TokenInput
          value={source.urlTemplate}
          isDisabled={isDisabled}
          placeholder="https://cdn.fresh8.co/assets/operator-jerseys/…/{TEAM_HOME_COMPETITOR_ID}.png"
          onChange={(urlTemplate) => update(el.id, { urlTemplate })}
        />
        <Text fontSize="12px" color="gray.500" fontStyle="italic" mt={1}>
          Type &quot;{'{'}&quot; to use a variable in your URL. For example:
          https://cdn.fresh8.co/assets/operator-jerseys/sportradar/&#123;TEAM_AWAY_COMPETITOR_ID&#125;.png
        </Text>
      </Box>

      <Box>
        <FieldLabel>Preview</FieldLabel>
        <Text fontSize="11px" fontFamily="mono" color="gray.600" wordBreak="break-all" mb={1.5}>
          {url}
        </Text>
        <ProbeStatusRow url={url} canLoad={canLoad} />
      </Box>

      <Box>
        <FieldLabel>If the image can&apos;t be found</FieldLabel>
        <Select
          size="sm"
          borderRadius="6px"
          isDisabled={isDisabled}
          value={source.fallback}
          onChange={(e) => update(el.id, { fallback: e.target.value as CustomFallback })}
        >
          <option value="jersey">Show Sportradar jersey</option>
          <option value="badge">Show Sportradar badge</option>
          <option value="static">Show a static image</option>
          <option value="none">Hide the element</option>
        </Select>

        {usesTeamFallback && !inferred && (
          <Box mt={3}>
            <FieldLabel>Fallback team</FieldLabel>
            <Segmented<TeamSide>
              value={source.fallbackTeam}
              isDisabled={isDisabled}
              onChange={(fallbackTeam) => update(el.id, { fallbackTeam })}
              options={[
                { value: 'home', label: 'Home' },
                { value: 'away', label: 'Away' },
              ]}
            />
          </Box>
        )}
        {usesTeamFallback && (
          <HStack mt={3} spacing={3}>
            <Box
              boxSize="44px"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="6px"
              p={1}
              bg="gray.700"
              dangerouslySetInnerHTML={{
                __html: teamAssetSvg(inferred ?? source.fallbackTeam, source.fallback as TeamAssetKind),
              }}
            />
            <Text fontSize="12px" color="gray.500">
              {inferred ? `Team taken from the URL (${inferred}).` : 'Team assets need to know which side to show.'}
            </Text>
          </HStack>
        )}
        {source.fallback === 'static' && (
          <Box mt={3}>
            <FieldLabel>Fallback image URL</FieldLabel>
            <Input
              size="sm"
              borderRadius="6px"
              placeholder="https://…"
              isDisabled={isDisabled}
              value={source.fallbackUrl}
              onChange={(e) => update(el.id, { fallbackUrl: e.target.value })}
            />
          </Box>
        )}
      </Box>
    </VStack>
  );
}

/** The "what is this image?" section of the properties panel: pick a source, then configure it. */
export default function ImageSourceControls({
  el,
  canAuthor,
  hasEventData,
}: {
  el: ImageElement;
  canAuthor: boolean;
  hasEventData: boolean;
}) {
  const setKind = useEditorStore((s) => s.setImageSourceKind);
  const { source } = el;
  const teamDisabledReason = hasEventData ? null : 'Add an Event data source to use Sportradar team assets.';
  const isDisabled = !canAuthor;

  if (source.kind === 'unset') {
    return (
      <Box>
        <Text fontSize="17px" fontWeight={700} mb={1}>
          Choose image source
        </Text>
        <Text fontSize="12px" color="gray.500" mb={3}>
          You can change this at any time. Position, size and animation are kept.
        </Text>
        <SourceCards onPick={(k) => setKind(el.id, k)} isDisabled={isDisabled} teamDisabledReason={teamDisabledReason} />
        {isDisabled && (
          <Text fontSize="12px" color="gray.500" mt={3}>
            Turn on Add &amp; restyle elements to choose a source.
          </Text>
        )}
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Box>
        <Text fontSize="17px" fontWeight={700} mb={2}>
          Image source
        </Text>
        <ButtonGroup isAttached size="sm" variant="outline" width="100%" isDisabled={isDisabled}>
          {KINDS.map((kind) => {
            const selected = source.kind === kind;
            const blocked = kind === 'team' && !hasEventData && !selected;
            return (
              <Tooltip key={kind} label={teamDisabledReason} isDisabled={!blocked}>
                <Button
                  flex={1}
                  leftIcon={<Icon as={KIND_META[kind].icon} boxSize={3.5} />}
                  onClick={() => setKind(el.id, kind)}
                  isDisabled={blocked}
                  bg={selected ? 'mcBlue.50' : 'white'}
                  borderColor={selected ? 'mcBlue.300' : 'gray.200'}
                  color={selected ? 'mcBlue.600' : 'gray.600'}
                  fontWeight={600}
                  px={2}
                >
                  {SOURCE_LABELS[kind]}
                </Button>
              </Tooltip>
            );
          })}
        </ButtonGroup>
      </Box>

      {source.kind === 'static' && <StaticControls el={el} source={source} isDisabled={isDisabled} />}
      {source.kind === 'team' && <TeamControls el={el} source={source} isDisabled={isDisabled} />}
      {source.kind === 'custom' && <CustomControls el={el} source={source} isDisabled={isDisabled} />}
    </VStack>
  );
}
