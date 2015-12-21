/**
 * Base64 URI safe
 * [^\x00-\xFF]な文字しか来ない前提
 */
class Base64 {
	/**
	 * btoa
	 */
	public static btoa(b: string): string {
		return window.btoa(b)
			.replace(/[+\/]/g, (m0) => {return m0 == '+' ? '-' : '_';})
			.replace(/=/g, '');
	}
	/**
	 * atob
	 */
	public static atob(a: string): string {
		a = a.replace(/[-_]/g, (m0) => {return m0 == '-' ? '+' : '/';});
		if(a.length % 4 == 1) a += 'A';

		return window.atob(a);
	}
	/**
	 * isValid
	 */
	public static isValid(a: string): boolean {
		return (/^[A-Za-z0-9-_]+$/).test(a);
	}
}