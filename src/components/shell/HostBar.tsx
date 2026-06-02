import { Box, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { LuChevronDown } from 'react-icons/lu';
import { TbGridDots } from 'react-icons/tb';
import { FiArrowRight } from 'react-icons/fi';
import { useEditorStore } from '../../store/editorStore';

export default function HostBar() {
  const advertiser = useEditorStore((s) => s.advertiser);

  return (
    <Flex
      h="52px"
      align="center"
      px={4}
      borderBottomWidth="1px"
      borderColor="gray.200"
      bg="white"
      flexShrink={0}
    >
      <HStack spacing={3}>
        <Icon as={TbGridDots} boxSize={5} color="gray.500" />
        <Text fontSize="16px" color="gray.800">
          Marketing{' '}
          <Text as="span" fontWeight={800}>
            Cloud
          </Text>
        </Text>
      </HStack>

      <HStack spacing={2} ml={10} color="gray.600" fontSize="14px">
        <Text>Creative Hub</Text>
        <Text color="gray.300">|</Text>
        <Text color="gray.900" fontWeight={600}>
          Templates
        </Text>
      </HStack>

      <Box flex={1} />

      <HStack spacing={6}>
        <Box textAlign="right" lineHeight="1.1">
          <Text fontSize="11px" color="gray.500">
            Advertiser
          </Text>
          <HStack spacing={1}>
            <Text fontSize="14px" color="gray.900" fontWeight={600}>
              {advertiser}
            </Text>
            <Icon as={LuChevronDown} color="gray.500" />
          </HStack>
        </Box>
        <HStack spacing={1} color="gray.700" cursor="pointer" _hover={{ color: 'mcBlue.500' }}>
          <Text fontSize="14px" fontWeight={600}>
            Sign Out
          </Text>
          <Icon as={FiArrowRight} />
        </HStack>
      </HStack>
    </Flex>
  );
}
