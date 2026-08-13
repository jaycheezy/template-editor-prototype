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
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { LuAlignCenter, LuAlignLeft, LuAlignRight, LuInfo } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';
import { usePhase } from '../../store/featureStore';
import type { AdElement, TextElement, VectorElement } from '../../types';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel fontSize="13px" fontWeight={600} color="gray.700" mb={1}>
      {children}
    </FormLabel>
  );
}

function NumberField({
  label,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  isDisabled?: boolean;
}) {
  return (
    <Box flex={1}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        size="sm"
        borderRadius="6px"
        type="number"
        isDisabled={isDisabled}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Box>
  );
}

function ColorField({
  label,
  value,
  onChange,
  isDisabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isDisabled?: boolean;
}) {
  return (
    <Box flex={1}>
      <FieldLabel>{label}</FieldLabel>
      <HStack spacing={2}>
        <Box
          as="input"
          type="color"
          value={value}
          disabled={isDisabled}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          width="36px"
          height="32px"
          p={0}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="6px"
          cursor={isDisabled ? 'not-allowed' : 'pointer'}
          bg="white"
        />
        <Input
          size="sm"
          borderRadius="6px"
          value={value}
          isDisabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </HStack>
    </Box>
  );
}

function PositionSizeFields({
  el,
  canMove,
  canResize,
}: {
  el: AdElement;
  canMove: boolean;
  canResize: boolean;
}) {
  const update = useEditorStore((s) => s.updateElement);
  const resizeElement = useEditorStore((s) => s.resizeElement);
  return (
    <Box>
      <HStack spacing={5}>
        <NumberField
          label="X position"
          value={el.position.x}
          isDisabled={!canMove}
          onChange={(v) => update(el.id, { position: { ...el.position, x: v } })}
        />
        <NumberField
          label="Y position"
          value={el.position.y}
          isDisabled={!canMove}
          onChange={(v) => update(el.id, { position: { ...el.position, y: v } })}
        />
      </HStack>
      <HStack spacing={5} mt={4}>
        <NumberField
          label="Width"
          value={el.size.width}
          isDisabled={!canResize}
          onChange={(v) => resizeElement(el.id, { width: v, height: el.size.height })}
        />
        <NumberField
          label="Height"
          value={el.size.height}
          isDisabled={!canResize}
          onChange={(v) => resizeElement(el.id, { width: el.size.width, height: v })}
        />
      </HStack>
    </Box>
  );
}

function TextControls({
  el,
  canMove,
  canAuthor,
}: {
  el: TextElement;
  canMove: boolean;
  canAuthor: boolean;
}) {
  const update = useEditorStore((s) => s.updateTextElement);

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Text fontSize="17px" fontWeight={700} mb={2}>
          Content template
        </Text>
        <Textarea
          size="sm"
          rows={1}
          borderRadius="6px"
          value={el.content}
          onChange={(e) => update(el.id, { content: e.target.value })}
        />
        <Text fontSize="12px" color="gray.500" mt={1}>
          Type &quot;{'{'}&quot; to use a variable in your text.
        </Text>
      </Box>

      <HStack justify="space-between">
        <Text fontSize="13px" fontWeight={600} color="gray.700">
          Enable auto fitting text?
        </Text>
        <HStack>
          <Switch colorScheme="mcBlue" size="md" />
          <Icon as={LuInfo} color="gray.400" />
        </HStack>
      </HStack>

      <Box>
        <Text fontSize="17px" fontWeight={700} mb={3}>
          Typography
        </Text>
        <HStack align="flex-end" spacing={5}>
          <Box>
            <FieldLabel>Align</FieldLabel>
            <ButtonGroup isAttached size="sm" variant="outline">
              {([['left', LuAlignLeft], ['center', LuAlignCenter], ['right', LuAlignRight]] as const).map(
                ([a, IconC]) => (
                  <Button
                    key={a}
                    onClick={() => update(el.id, { align: a })}
                    bg={el.align === a ? 'mcBlue.50' : 'white'}
                    borderColor={el.align === a ? 'mcBlue.300' : 'gray.200'}
                    color={el.align === a ? 'mcBlue.600' : 'gray.600'}
                    px={2}
                  >
                    <Icon as={IconC} />
                  </Button>
                ),
              )}
            </ButtonGroup>
          </Box>
          <NumberField label="Font size" value={el.fontSize} onChange={(v) => update(el.id, { fontSize: v })} />
          <NumberField
            label="Line height"
            value={el.lineHeight * 10}
            onChange={(v) => update(el.id, { lineHeight: v / 10 })}
          />
        </HStack>
      </Box>

      {(canAuthor || canMove) && (
        <Box>
          <Text fontSize="17px" fontWeight={700} mb={3}>
            Color &amp; layout
          </Text>
          {canAuthor && (
            <ColorField label="Text color" value={el.color} onChange={(v) => update(el.id, { color: v })} />
          )}
          {(canMove || canAuthor) && (
            <Box mt={canAuthor ? 4 : 0}>
              <PositionSizeFields el={el} canMove={canMove} canResize={canAuthor} />
            </Box>
          )}
        </Box>
      )}

      <Box>
        <Text fontSize="17px" fontWeight={700} mb={2}>
          Font
        </Text>
        <Select size="sm" borderRadius="6px" mb={3} defaultValue="ssp-black">
          <option value="ssp-black">SourceSansPro Black (Custom)</option>
          <option value="ssp-regular">SourceSansPro Regular (Custom)</option>
        </Select>
        <Select
          size="sm"
          borderRadius="6px"
          value={el.fontWeight}
          onChange={(e) => update(el.id, { fontWeight: Number(e.target.value) })}
        >
          <option value={900}>Black</option>
          <option value={700}>Bold</option>
          <option value={600}>Semibold</option>
          <option value={400}>Regular</option>
        </Select>
      </Box>

      <Box>
        <Text fontSize="17px" fontWeight={700} mb={2}>
          Case
        </Text>
        <ButtonGroup isAttached size="sm" variant="outline">
          {([['none', '—'], ['upper', 'AB'], ['lower', 'ab'], ['title', 'Aa']] as const).map(([c, label]) => (
            <Button
              key={c}
              onClick={() => update(el.id, { textCase: c })}
              bg={el.textCase === c ? 'mcBlue.50' : 'white'}
              borderColor={el.textCase === c ? 'mcBlue.300' : 'gray.200'}
              color={el.textCase === c ? 'mcBlue.600' : 'gray.600'}
              minW="44px"
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </VStack>
  );
}

function VectorControls({
  el,
  canMove,
  canAuthor,
}: {
  el: VectorElement;
  canMove: boolean;
  canAuthor: boolean;
}) {
  const update = useEditorStore((s) => s.updateElement);
  const setFill = (fill: string) => {
    const svg = el.svg.split(el.fill).join(fill);
    update(el.id, { svg, fill } as Partial<AdElement>);
  };
  return (
    <VStack align="stretch" spacing={6}>
      <Text fontSize="13px" color="gray.500">
        Vector element.
      </Text>
      {canAuthor || canMove ? (
        <>
          {canAuthor && <ColorField label="Fill color" value={el.fill} onChange={setFill} />}
          <PositionSizeFields el={el} canMove={canMove} canResize={canAuthor} />
        </>
      ) : (
        <Text fontSize="13px" color="gray.500">
          Turn on Fix existing layout to edit position, or Add &amp; restyle elements to edit fill and size.
        </Text>
      )}
    </VStack>
  );
}

function ImageControls({
  el,
  canMove,
  canAuthor,
}: {
  el: AdElement;
  canMove: boolean;
  canAuthor: boolean;
}) {
  return (
    <VStack align="stretch" spacing={6}>
      <Text fontSize="13px" color="gray.500">
        Image element. Drag a handle on the canvas to resize.
      </Text>
      {canAuthor || canMove ? (
        <PositionSizeFields el={el} canMove={canMove} canResize={canAuthor} />
      ) : (
        <Text fontSize="13px" color="gray.500">
          Turn on Fix existing layout to edit position, or Add &amp; restyle elements to resize.
        </Text>
      )}
    </VStack>
  );
}

function GroupControls({ groupId, canGroup }: { groupId: string; canGroup: boolean }) {
  const groups = useEditorStore((s) => s.groups);
  const elements = useEditorStore((s) => s.elements);
  const updateGroupTransform = useEditorStore((s) => s.updateGroupTransform);
  const group = groups[groupId];
  if (!group) return null;

  const children = elements.filter((e) => e.parentId === groupId);
  let w = 0;
  let h = 0;
  if (children.length) {
    const minX = Math.min(...children.map((c) => c.position.x));
    const minY = Math.min(...children.map((c) => c.position.y));
    const maxX = Math.max(...children.map((c) => c.position.x + c.size.width));
    const maxY = Math.max(...children.map((c) => c.position.y + c.size.height));
    w = maxX - minX;
    h = maxY - minY;
  }

  return (
    <VStack align="stretch" spacing={5}>
      <Text fontSize="13px" color="gray.500">
        Group transform composes onto all {group.children.length} child layers.
      </Text>
      <HStack spacing={5}>
        <NumberField
          label="X offset"
          value={group.transform.x}
          isDisabled={!canGroup}
          onChange={(v) => updateGroupTransform(group.id, { x: v })}
        />
        <NumberField
          label="Y offset"
          value={group.transform.y}
          isDisabled={!canGroup}
          onChange={(v) => updateGroupTransform(group.id, { y: v })}
        />
      </HStack>
      <HStack spacing={5}>
        <NumberField
          label="Rotation"
          value={group.transform.rotation}
          isDisabled={!canGroup}
          onChange={(v) => updateGroupTransform(group.id, { rotation: v })}
        />
        <NumberField
          label="Opacity %"
          value={group.transform.opacity * 100}
          isDisabled={!canGroup}
          onChange={(v) => updateGroupTransform(group.id, { opacity: v / 100 })}
        />
      </HStack>
      <HStack spacing={5}>
        <NumberField label="Width" value={w} isDisabled onChange={() => undefined} />
        <NumberField label="Height" value={h} isDisabled onChange={() => undefined} />
      </HStack>
    </VStack>
  );
}

export default function PropertiesPanel() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const canMove = usePhase('layout');
  const canAuthor = usePhase('author');
  const canGroup = usePhase('groups');
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const el = elements.find((e) => e.id === primaryId) ?? null;
  const group = primaryId ? groups[primaryId] : undefined;

  if (selectedIds.length > 1) {
    return (
      <Flex px={6} py={4} direction="column">
        <Text fontSize="13px" color="gray.600" lineHeight="1.5">
          {selectedIds.length} layers selected. Select a single layer to edit its properties. Use ⌘/Ctrl+click to
          add or remove items, and Shift+click to select a range in the layer list.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex px={6} py={4} direction="column">
      {group ? (
        <GroupControls groupId={group.id} canGroup={canGroup} />
      ) : el && el.type === 'TEXT' ? (
        <TextControls el={el} canMove={canMove} canAuthor={canAuthor} />
      ) : el && el.type === 'VECTOR' ? (
        <VectorControls el={el} canMove={canMove} canAuthor={canAuthor} />
      ) : el ? (
        <ImageControls el={el} canMove={canMove} canAuthor={canAuthor} />
      ) : null}
    </Flex>
  );
}
