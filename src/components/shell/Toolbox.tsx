import { Center, Icon, IconButton, VStack } from '@chakra-ui/react';
import { SiFigma } from 'react-icons/si';
import { LuDatabase } from 'react-icons/lu';
import { BsRecordCircleFill } from 'react-icons/bs';

export default function Toolbox() {
  return (
    <VStack
      align="center"
      borderRightWidth="1px"
      borderColor="gray.200"
      py={3}
      px={3}
      spacing={4}
      bg="white"
      flexShrink={0}
    >
      <Center boxSize="34px" borderRadius="full" bg="gray.50" borderWidth="1px" borderColor="gray.200">
        <Icon as={SiFigma} color="#A259FF" boxSize={4} />
      </Center>
      <Center boxSize="34px" borderRadius="full" bg="#00C4CC" color="white">
        <Icon as={SiFigma} boxSize={4} opacity={0} />
        <span style={{ position: 'absolute', fontWeight: 800, fontSize: 14 }}>C</span>
      </Center>
      <Center boxSize="34px" borderRadius="full" bg="#7A4B2A" color="white" fontWeight={800} fontSize="15px">
        B
      </Center>
      <Center boxSize="34px" borderRadius="full" bg="gray.50" borderWidth="1px" borderColor="gray.200">
        <Icon as={BsRecordCircleFill} color="#E10600" boxSize={4} />
      </Center>
      <IconButton
        aria-label="Data sources"
        icon={<Icon as={LuDatabase} />}
        borderRadius="full"
        boxSize="34px"
        minW="34px"
        colorScheme="mcBlue"
        variant="ghost"
        bg="gray.50"
        borderWidth="1px"
        borderColor="gray.200"
        color="gray.600"
      />
    </VStack>
  );
}
