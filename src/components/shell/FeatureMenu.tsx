import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Collapse,
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
import { LuChevronDown, LuChevronRight, LuSparkles } from 'react-icons/lu';
import {
  EPIC_PHASE_IDS,
  LATER_PHASE_IDS,
  PHASE_BY_ID,
  type PhaseId,
} from '../../lib/phases';
import { resolveEffective, useFeatureStore } from '../../store/featureStore';

export default function FeatureMenu() {
  const flags = useFeatureStore((s) => s.flags);
  const setFlag = useFeatureStore((s) => s.setFlag);
  const setAll = useFeatureStore((s) => s.setAll);
  const reset = useFeatureStore((s) => s.reset);
  const [laterOpen, setLaterOpen] = useState(false);

  const effective = resolveEffective(flags);
  const epicOn = EPIC_PHASE_IDS.filter((id) => effective[id]).length;

  const renderSwitch = (id: PhaseId) => {
    const p = PHASE_BY_ID[id];
    const isEffective = effective[id];
    const isRaw = flags[id];
    const blockedByDep = isRaw && !isEffective;
    return (
      <Box
        key={id}
        px={4}
        py={2.5}
        _hover={{ bg: 'gray.50' }}
        cursor="pointer"
        onClick={() => setFlag(id, !isRaw)}
      >
        <Flex align="center" gap={3}>
          <Switch isChecked={isRaw} colorScheme="mcBlue" pointerEvents="none" readOnly tabIndex={-1} />
          <Box flex={1}>
            <HStack spacing={2}>
              <Text fontSize="13px" fontWeight={700} color="gray.800">
                {p.label}
              </Text>
              {p.epic && (
                <Badge fontSize="9px" colorScheme="gray" borderRadius="full">
                  {p.epic}
                </Badge>
              )}
              {blockedByDep && (
                <Badge colorScheme="orange" fontSize="9px">
                  needs {p.requires.map((r) => PHASE_BY_ID[r].short).join(', ')}
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
  };

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
          {epicOn}/{EPIC_PHASE_IDS.length}
        </Badge>
      </MenuButton>
      <MenuList minW="380px" maxH="80vh" overflowY="auto" px={0} py={2} shadow="xl">
        <HStack px={4} pb={2} justify="space-between">
          <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500">
            Epics
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
        <VStack align="stretch" spacing={0}>
          {EPIC_PHASE_IDS.map(renderSwitch)}
        </VStack>
        <Divider my={1} />
        <Box
          px={4}
          py={2}
          cursor="pointer"
          _hover={{ bg: 'gray.50' }}
          onClick={() => setLaterOpen((v) => !v)}
        >
          <HStack spacing={2}>
            <Icon as={laterOpen ? LuChevronDown : LuChevronRight} boxSize={3.5} color="gray.500" />
            <Text fontSize="11px" fontWeight={700} textTransform="uppercase" color="gray.500">
              Later
            </Text>
            <Badge fontSize="9px" colorScheme="gray">
              3b / 3c
            </Badge>
          </HStack>
        </Box>
        <Collapse in={laterOpen} animateOpacity>
          <VStack align="stretch" spacing={0}>
            {LATER_PHASE_IDS.map(renderSwitch)}
          </VStack>
        </Collapse>
      </MenuList>
    </Menu>
  );
}
