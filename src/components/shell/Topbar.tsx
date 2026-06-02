import { useState } from 'react';
import { Button, Flex, HStack, Icon, Input, Text } from '@chakra-ui/react';
import { LuPencil } from 'react-icons/lu';
import { useEditorStore } from '../../store/editorStore';

export default function Topbar() {
  const name = useEditorStore((s) => s.name);
  const setName = useEditorStore((s) => s.setName);
  const [editing, setEditing] = useState(false);

  return (
    <Flex h="56px" align="center" px={4} borderBottomWidth="1px" borderColor="gray.200" bg="white" flexShrink={0}>
      <HStack spacing={2}>
        {editing ? (
          <Input
            value={name}
            autoFocus
            size="sm"
            width="260px"
            fontSize="20px"
            fontWeight={700}
            variant="flushed"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
          />
        ) : (
          <Text fontSize="20px" fontWeight={700} color="gray.900">
            {name}
          </Text>
        )}
        <Icon
          as={LuPencil}
          color="gray.400"
          boxSize={4}
          cursor="pointer"
          _hover={{ color: 'mcBlue.500' }}
          onClick={() => setEditing(true)}
        />
      </HStack>

      <Flex flex={1} justify="flex-end" gap={3}>
        <Button
          variant="solid"
          bg="#E4F3FF"
          color="#3367D6"
          _hover={{ bg: '#d6ecff' }}
          size="sm"
          px={5}
          fontWeight={700}
        >
          Cancel
        </Button>
        <Button colorScheme="mcBlue" size="sm" px={6} fontWeight={700}>
          Save
        </Button>
      </Flex>
    </Flex>
  );
}
