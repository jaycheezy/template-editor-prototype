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
import type { AdElement, TextElement } from '../../types';

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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Box flex={1}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        size="sm"
        borderRadius="6px"
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Box>
  );
}

function TextControls({ el }: { el: TextElement }) {
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

        <HStack mt={5} spacing={5}>
          <NumberField
            label="X position"
            value={el.position.x}
            onChange={(v) => update(el.id, { position: { ...el.position, x: v } })}
          />
          <NumberField
            label="Y position"
            value={el.position.y}
            onChange={(v) => update(el.id, { position: { ...el.position, y: v } })}
          />
        </HStack>
      </Box>

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

function GroupOrGenericControls({ el }: { el: AdElement | null }) {
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateGroupTransform = useEditorStore((s) => s.updateGroupTransform);
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const group = primaryId ? groups[primaryId] : undefined;

  if (group) {
    return (
      <VStack align="stretch" spacing={5}>
        <Text fontSize="13px" color="gray.500">
          Group transform composes onto all {group.children.length} child layers.
        </Text>
        <HStack spacing={5}>
          <NumberField
            label="X offset"
            value={group.transform.x}
            onChange={(v) => updateGroupTransform(group.id, { x: v })}
          />
          <NumberField
            label="Y offset"
            value={group.transform.y}
            onChange={(v) => updateGroupTransform(group.id, { y: v })}
          />
        </HStack>
        <HStack spacing={5}>
          <NumberField
            label="Rotation"
            value={group.transform.rotation}
            onChange={(v) => updateGroupTransform(group.id, { rotation: v })}
          />
          <NumberField
            label="Opacity %"
            value={group.transform.opacity * 100}
            onChange={(v) => updateGroupTransform(group.id, { opacity: v / 100 })}
          />
        </HStack>
      </VStack>
    );
  }

  if (el) {
    return (
      <VStack align="stretch" spacing={5}>
        <HStack spacing={5}>
          <NumberField label="X position" value={el.position.x} onChange={() => undefined} />
          <NumberField label="Y position" value={el.position.y} onChange={() => undefined} />
        </HStack>
        <Text fontSize="13px" color="gray.500">
          {el.type} element. Drag it on the canvas to reposition.
        </Text>
      </VStack>
    );
  }

  return null;
}

export default function PropertiesPanel() {
  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const el = elements.find((e) => e.id === primaryId) ?? null;

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
      {el && el.type === 'TEXT' ? <TextControls el={el} /> : <GroupOrGenericControls el={el} />}
    </Flex>
  );
}
