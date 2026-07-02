import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Tracks soft-keyboard height and visibility for scroll padding / dismiss toolbar. */
export function useKeyboardInset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return {
    keyboardHeight,
    keyboardVisible: keyboardHeight > 0,
    dismissKeyboard: Keyboard.dismiss,
  };
}

export const FACULTY_BOTTOM_NAV_CLEARANCE = 120;
