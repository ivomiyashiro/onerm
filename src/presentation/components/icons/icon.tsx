import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import AlertSvg from '@/presentation/components/icons/svg/alert.svg';
import BackSvg from '@/presentation/components/icons/svg/back.svg';
import ChartSvg from '@/presentation/components/icons/svg/chart.svg';
import CheckSvg from '@/presentation/components/icons/svg/check.svg';
import ChevronSvg from '@/presentation/components/icons/svg/chevron.svg';
import CloudOffSvg from '@/presentation/components/icons/svg/cloud-off.svg';
import CloudOkSvg from '@/presentation/components/icons/svg/cloud-ok.svg';
import DumbbellSvg from '@/presentation/components/icons/svg/dumbbell.svg';
import HomeSvg from '@/presentation/components/icons/svg/home.svg';
import InfoSvg from '@/presentation/components/icons/svg/info.svg';
import ListSvg from '@/presentation/components/icons/svg/list.svg';
import MinusSvg from '@/presentation/components/icons/svg/minus.svg';
import PlusSvg from '@/presentation/components/icons/svg/plus.svg';
import RefreshSvg from '@/presentation/components/icons/svg/refresh.svg';
import SearchSvg from '@/presentation/components/icons/svg/search.svg';
import UserSvg from '@/presentation/components/icons/svg/user.svg';
import WifiOffSvg from '@/presentation/components/icons/svg/wifi-off.svg';
import XSvg from '@/presentation/components/icons/svg/x.svg';

// Exported from the Figma «Íconos» section (stroke icons, 24 dp, 2 px stroke).
const ICONS = {
  alert: AlertSvg,
  back: BackSvg,
  chart: ChartSvg,
  check: CheckSvg,
  chevron: ChevronSvg,
  'cloud-off': CloudOffSvg,
  'cloud-ok': CloudOkSvg,
  dumbbell: DumbbellSvg,
  home: HomeSvg,
  info: InfoSvg,
  list: ListSvg,
  minus: MinusSvg,
  plus: PlusSvg,
  refresh: RefreshSvg,
  search: SearchSvg,
  user: UserSvg,
  'wifi-off': WifiOffSvg,
  x: XSvg,
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof ICONS;

export const iconNames = Object.keys(ICONS) as IconName[];

interface IconProps {
  name: IconName;
  color: string;
  size?: number;
  testID?: string;
}

/** Decorative: the control that contains it carries the accessibility label (RNF-18). */
export function Icon({ name, color, size = 24, testID }: IconProps) {
  const Svg = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      color={color}
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
