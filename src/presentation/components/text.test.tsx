import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { Text, TEXT_SLACK } from '@/presentation/components/text';

function setPlatform(os: 'android' | 'ios', version: number) {
  jest.replaceProperty(Platform, 'OS', os);
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version);
}

const styleOf = () => StyleSheet.flatten(screen.getByText('Abrir la hoja').props.style);

describe('Text', () => {
  afterEach(() => jest.restoreAllMocks());

  it('on Android 15+ adds half a physical pixel at the end, so the last word never wraps away', async () => {
    setPlatform('android', 35);

    await render(<Text style={{ fontSize: 16 }}>Abrir la hoja</Text>);

    expect(TEXT_SLACK).toBeGreaterThan(0);
    expect(styleOf()).toMatchObject({ fontSize: 16, paddingRight: TEXT_SLACK });
  });

  it('keeps the padding the caller set and adds the slack to it', async () => {
    setPlatform('android', 36);

    await render(<Text style={{ paddingHorizontal: 4 }}>Abrir la hoja</Text>);

    expect(styleOf()).toMatchObject({ paddingHorizontal: 4, paddingRight: 4 + TEXT_SLACK });
  });

  it.each([
    ['Android 14', 'android', 34],
    ['iOS', 'ios', 18],
  ] as const)('leaves %s alone', async (_, os, version) => {
    setPlatform(os, version);

    await render(<Text style={{ fontSize: 16 }}>Abrir la hoja</Text>);

    expect(styleOf().paddingRight).toBeUndefined();
  });
});
