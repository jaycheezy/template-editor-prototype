import { Flex } from '@chakra-ui/react';
import HostBar from '../shell/HostBar';
import Topbar from '../shell/Topbar';
import Toolbox from '../shell/Toolbox';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Canvas from '../canvas/Canvas';
import Timeline from '../timeline/Timeline';

export default function Editor() {
  return (
    <Flex direction="column" height="100vh" overflow="hidden">
      <HostBar />
      <Topbar />
      <Flex flex={1} overflow="hidden">
        <Toolbox />
        <LeftSidebar />
        <Flex direction="column" flex={1} overflow="hidden" bg="gray.100">
          <Canvas />
          <Timeline />
        </Flex>
        <RightSidebar />
      </Flex>
    </Flex>
  );
}
