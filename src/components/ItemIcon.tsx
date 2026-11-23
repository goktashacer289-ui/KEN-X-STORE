import React from 'react';
import {
  MessageSquareShare,
  Music2,
  Cpu,
  Zap,
  Gamepad2,
  Sparkles,
  Car,
  Sword,
  Rocket,
  Flame,
  Shield,
  Layers,
  Code2,
  Bot
} from 'lucide-react';

interface ItemIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ name, className = 'w-6 h-6', size = 24 }) => {
  switch (name) {
    case 'MessageSquareShare':
      return <MessageSquareShare size={size} className={className} />;
    case 'Music2':
      return <Music2 size={size} className={className} />;
    case 'Cpu':
      return <Cpu size={size} className={className} />;
    case 'Zap':
      return <Zap size={size} className={className} />;
    case 'Gamepad2':
      return <Gamepad2 size={size} className={className} />;
    case 'Sparkles':
      return <Sparkles size={size} className={className} />;
    case 'Car':
      return <Car size={size} className={className} />;
    case 'Sword':
      return <Sword size={size} className={className} />;
    case 'Rocket':
      return <Rocket size={size} className={className} />;
    case 'Flame':
      return <Flame size={size} className={className} />;
    case 'Shield':
      return <Shield size={size} className={className} />;
    case 'Layers':
      return <Layers size={size} className={className} />;
    case 'Code2':
      return <Code2 size={size} className={className} />;
    case 'Bot':
      return <Bot size={size} className={className} />;
    default:
      return <Gamepad2 size={size} className={className} />;
  }
};
