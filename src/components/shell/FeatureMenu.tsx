import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LuChevronDown, LuSparkles } from 'react-icons/lu';
import { PHASES } from '../../lib/phases';
import { resolveEffective, useFeatureStore } from '../../store/featureStore';

export default function FeatureMenu() {
  const flags = useFeatureStore((s) => s.flags);
  const setFlag = useFeatureStore((s) => s.setFlag);
  const setAll = useFeatureStore((s) => s.setAll);
  const reset = useFeatureStore((s) => s.reset);

  const effective = resolveEffective(flags);
  const onCount = PHASES.filter((p) => effective[p.id]).length;

  return (
    <Menu closeOnSelect={false} placement="bottom-end">
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        leftIcon={<Icon as={LuSparkles} />}
        rightIcon={<Icon as={LuChevronDown} />}
        fontWeight={700}
      >
        Preview features
        <Badge ml={2} colorScheme="mcBlue" borderRadius="full" px={2}>
          {onCount}/{PHASES.length}
        </Badge>
      </MenuButton>
      <MenuList minW="340px" px={0} py={2} shadow="xl">
        <HStack px={4} pb={2} justify="space-between">
          <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500">
            Roadmap phases
          </Text>
          <HStack spacing={1}>
            <Button size="xs" variant="ghost" onClick={() => setAll(true)}>
              All on
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setAll(false)}>
              All off
            </Button>
            <Button size="xs" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </HStack>
        </HStack>
        <Divider />
        <VStack align="stretch" spacing={0} pt={1}>
          {PHASES.map((p) => {
            const isEffective = effective[p.id];
            const isRaw = flags[p.id];
            const blockedByDep = isRaw && !isEffective;
            return (
              <Box
                key={p.id}
                px={4}
                py={2.5}
                _hover={{ bg: 'gray.50' }}
                cursor="pointer"
                onClick={() => setFlag(p.id, !isRaw)}
              >
                <Flex align="center" gap={3}>
                  <Switch
                    isChecked={isRaw}
                    colorScheme="mcBlue"
                    pointerEvents="none"
                    readOnly
                    tabIndex={-1}
                  />
                  <Box flex={1}>
                    <HStack spacing={2}>
                      <Text fontSize="13px" fontWeight={700} color="gray.800">
                        {p.label}
                      </Text>
                      {blockedByDep && (
                        <Badge colorScheme="orange" fontSize="9px">
                          needs {p.requires.join(', ')}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="11px" color="gray.500" lineHeight="1.35">
                      {p.description}
                    </Text>
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      </MenuList>
    </Menu>
  );
}
