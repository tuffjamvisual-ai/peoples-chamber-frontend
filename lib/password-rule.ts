// The one password rule (security review M3, owner approved 14 Nov 2026, COWORK-TO-T1 ENTRY 59): 8 or more characters
// with at least one letter and one number. Used at sign-up (which had no rule), password reset and password change.
export const PASSWORD_RULE_TEXT = '8 or more characters with a letter and a number';
export const passwordOk = (pw: string) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
