import { FaShapes } from 'react-icons/fa';
import { LuImage, LuLink, LuShirt, LuType } from 'react-icons/lu';
import { PiBoundingBox } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import type { AdElement } from '../types';

/** Layer / header icon for an element. Images reflect their current source. */
export function iconForElement(el: AdElement): IconType {
  switch (el.type) {
    case 'SVG':
      return FaShapes;
    case 'IMAGE':
      if (el.source.kind === 'team') return LuShirt;
      if (el.source.kind === 'custom') return LuLink;
      return LuImage;
    case 'VECTOR':
      return PiBoundingBox;
    default:
      return LuType;
  }
}
