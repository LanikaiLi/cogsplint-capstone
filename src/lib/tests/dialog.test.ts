import { getActiveHostId, getDialog, pressDialogButton, registerDialogHost, showDialog } from '@/lib/dialog';

describe('showDialog and pressDialogButton', () => {
  it('adds an OK button when none are given', () => {
    showDialog('Title', 'Message');
    expect(getDialog()?.buttons).toEqual([{ text: 'OK' }]);
    pressDialogButton();
    expect(getDialog()).toBeNull();
  });

  it('closes the popup and runs the pressed button', () => {
    const remove = jest.fn();
    showDialog('Delete?', 'Sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', onPress: remove }]);
    pressDialogButton(getDialog()?.buttons[1]);
    expect(remove).toHaveBeenCalled();
    expect(getDialog()).toBeNull();
  });

  it('keeps a new popup that the button opens', () => {
    showDialog('First', '', [{ text: 'OK', onPress: () => showDialog('Second', '') }]);
    pressDialogButton(getDialog()?.buttons[0]);
    expect(getDialog()?.title).toBe('Second');
    pressDialogButton();
  });
});

describe('dialog hosts', () => {
  it('draws on the top layer, whatever order the hosts appeared in', () => {
    const sheet = registerDialogHost(1);
    const main = registerDialogHost(0);
    expect(getActiveHostId()).toBe(sheet.id);
    const window = registerDialogHost(2);
    expect(getActiveHostId()).toBe(window.id);
    window.remove();
    sheet.remove();
    expect(getActiveHostId()).toBe(main.id);
    main.remove();
    expect(getActiveHostId()).toBeNull();
  });
});
