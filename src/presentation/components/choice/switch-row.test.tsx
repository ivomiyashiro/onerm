import { render, screen, userEvent } from '@testing-library/react-native';

import { SwitchRow } from '@/presentation/components/choice/switch-row';

describe('SwitchRow (RNF-16, RNF-18)', () => {
  it('the whole row is the switch: a tap anywhere asks for the opposite value', async () => {
    const onChange = jest.fn();
    await render(<SwitchRow label="Distinto por lado" value={false} onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: 'Distinto por lado' });
    expect(toggle).not.toBeChecked();
    await userEvent.press(screen.getByText('Distinto por lado'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reads the help and does nothing while disabled', async () => {
    const onChange = jest.fn();
    await render(<SwitchRow label="Avisos" help="Bloqueados" value disabled onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: 'Avisos' });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveProp('accessibilityHint', 'Bloqueados');
    await userEvent.press(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});
