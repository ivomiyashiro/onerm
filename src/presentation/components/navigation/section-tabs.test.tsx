import { render, screen, userEvent } from '@testing-library/react-native';

import { SectionTabs } from '@/presentation/components/navigation/section-tabs';

const TABS = [
  { key: 'mine', label: 'Mis rutinas' },
  { key: 'templates', label: 'Plantillas' },
];

describe('SectionTabs', () => {
  it('marks the selected tab and reports the one pressed', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<SectionTabs tabs={TABS} selectedKey="mine" onSelect={onSelect} />);

    expect(screen.getByRole('tab', { name: 'Mis rutinas' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Plantillas' })).not.toBeSelected();

    await user.press(screen.getByRole('tab', { name: 'Plantillas' }));
    expect(onSelect).toHaveBeenCalledWith('templates');
  });
});
