import { Box, Divider, Flex, HStack, Icon, Tag, Text } from '@chakra-ui/react';
import { IoTrophyOutline, IoCalendarClearOutline } from 'react-icons/io5';
import { useEditorStore } from '../../store/editorStore';
import LayerTree from './LayerTree';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text px={2} py={1} fontSize="20px" fontWeight={500} color="gray.800" letterSpacing="0.15px">
      {children}
    </Text>
  );
}

export default function LeftSidebar() {
  const dataSources = useEditorStore((s) => s.dataSources);

  return (
    <Flex
      direction="column"
      borderRightWidth="1px"
      borderColor="gray.200"
      minW="216px"
      maxW="216px"
      bg="white"
      flexShrink={0}
      overflowY="auto"
    >
      <Box pt={3} flex={1}>
        <SectionHeading>Elements</SectionHeading>
        <Divider />
        <LayerTree />
      </Box>

      <Box borderTopWidth="1px" borderColor="gray.200" pb={2}>
        <SectionHeading>Data Sources</SectionHeading>
        <Divider />
        {dataSources.map((ds) => {
          const icon = ds.market === 'market' ? IoTrophyOutline : IoCalendarClearOutline;
          return (
            <HStack key={ds.id} px={4} py={2} spacing={2} _hover={{ bg: 'mcBlue.50' }}>
              <Icon as={icon} boxSize={3.5} color="gray.500" />
              <Text fontSize="13px" color="gray.700">
                {ds.name}
              </Text>
              <Tag size="sm" colorScheme="green" borderRadius="full" fontWeight={700}>
                {ds.market}
              </Tag>
            </HStack>
          );
        })}
      </Box>
    </Flex>
  );
}
